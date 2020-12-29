// alert("I work");

[
  "Profile",
  "Account",
  "Address",
  "PhoneNumber",
  "EmailAddress",
  "Transaction",
].map((resourceName) => {
  let addButton = document.getElementById(`add${resourceName}Button`);

  if (addButton) {
    addButton.addEventListener(
      "click",
      () => showElement(`new${resourceName}Modal`),
      false
    );
  }

  let cancelAddButton = document.getElementById(
    `cancelAdd${resourceName}Button`
  );

  if (cancelAddButton) {
    cancelAddButton.addEventListener(
      "click",
      () => hideElement(`new${resourceName}Modal`),
      false
    );
  }

  let submitAddFormButton = document.getElementById(
    `submitAdd${resourceName}FormButton`
  );

  if (submitAddFormButton) {
    submitAddFormButton.addEventListener(
      "click",
      () => submitForm(`add${resourceName}Form`, `new${resourceName}Modal`),
      false
    );
  }
});

// Listen for 3DS lifecycle events for debugging purposes;

function showElement(id) {
  let modal = document.getElementById(id);
  if (modal) {
    modal.hidden = false;
  }
}

function hideElement(id) {
  let modal = document.getElementById(id);
  if (modal) {
    modal.hidden = true;
  }
}

function showModalErrors(modalID, message) {
  let modal = document.getElementById(modalID);
  let errorContainer = modal.querySelector("div.errorContainer");
  errorContainer.innerHTML = `<div class="bg-red-100 border border-red-200 text-red-600 pl-4 pr-8 py-3 rounded relative" role="alert">
      <strong class="font-bold">Whoops!</strong>
      <span class="block sm:inline">${message}</span>
      <a href="#" onclick="hideModalError(this)" class="absolute top-0 right-0 pr-2 py-3">
        <svg class="h-6 w-6 text-red" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
      </a>
    </div>`;
  errorContainer.hidden = false;
}

function hideModalError(element) {
  let errorContainer = element.parentElement.parentElement;
  errorContainer.innerHTML = "";
  errorContainer.hidden = true;
}

function submitForm(id, modalID) {
  let form = document.getElementById(id);
  if (form) {
    let type = form.dataset.remoteFormType;

    if (type) {
      let json = Array.from(form.querySelectorAll("input, select, textarea"))
        .filter((element) => element.name)
        .reduce((json, element) => {
          json[element.name] =
            element.type === "checkbox" ? element.checked : element.value;
          return json;
        }, {});

      let klass = modelForType(type);
      let action = form.dataset.remoteFormAction || "create";

      let params = klass[`${action}FormToJSON`](json);

      console.log(params);
      let threeDS2Options;

      if (json.three_d_secure_options) {
        threeDS2Options = JSON.parse(json.three_d_secure_options);
        let workflowContainerId = `${action}${klass.name}ThreeDSecureWorkflowContainer`;
        console.log(workflowContainerId);

        if (!threeDS2Options.session) {
          threeDS2Options.session = {};
        }
        threeDS2Options.session.element = workflowContainerId;
        threeDS2Options.session["challenge-window-size"] = "medium";

        let workflowContainer = document.getElementById(workflowContainerId);

        // Listen for 3DS lifecycle events for debugging purposes;
        [
          "start",
          "preauthComplete",
          "methodStart",
          "methodTimeout",
          "methodSubmitted",
          "methodComplete",
          "authError",
          "authComplete",
          "challengeStart",
          "challengeSubmitted",
          "challengeTimeout",
          "postauthError",
          "postauthComplete",
          "complete",
        ].map((eventName) => {
          workflowContainer.addEventListener(
            `opentransact:threeDSecure:${eventName}`,
            (event) => {
              console.log(
                `Received Event: opentransact:threeDSecure:${eventName}`
              );
              console.log(event);
            },
            false
          );
        });

        if (workflowContainer) {
          workflowContainer.addEventListener(
            "opentransact:threeDSecure:challengeStart",
            function handleChallengeStart() {
              form.hidden = true;
              workflowContainer.hidden = false;
              workflowContainer.removeEventListener(
                "opentransact:threeDSecure:challengeStart",
                handleChallengeStart,
                false
              );
            }
          );

          workflowContainer.addEventListener(
            "opentransact:threeDSecure:challengeTimeout",
            function handleChallengeTimeout() {
              workflowContainer.hidden = true;
              form.hidden = false;
              workflowContainer.removeEventListener(
                "opentransact:threeDSecure:challengeTimeout",
                handleChallengeTimeout,
                false
              );
            }
          );

          workflowContainer.addEventListener(
            "opentransact:threeDSecure:challengeSubmitted",
            function handleChallengeSubmitted() {
              workflowContainer.hidden = true;
              form.hidden = false;
              workflowContainer.removeEventListener(
                "opentransact:threeDSecure:challengeSubmitted",
                handleChallengeSubmitted,
                false
              );
            }
          );
        }
      }

      if (type == "transactions") {
        createTransaction(params, modalID, threeDS2Options);
      } else {
        if (action == "create") {
          createResource(params, modalID, threeDS2Options);
        } else if (action == "update") {
          updateResource(params, modalID, threeDS2Options);
        }
      }
    } else {
      form.submit();
    }
  }
  clearForm(id);
}

function createTransaction(params, modalID, threeDS2Options) {
  let type = "transactions";
  fetch(`/transactions`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify(params),
  })
    .then((result) => {
      if (!result.ok) throw result;
      return result.json();
    })
    .then((data) => {
      console.log(data);
      let threeDScomplete = false;
      window.client.poll("transactions", data.id, {
        update: async (updatedTransaction, next, complete) => {
          console.log("Received updated transaction");
          console.log(updatedTransaction);

          if (updatedTransaction.status == "processed") {
            // hide modal
            hideElement(modalID);
            // refresh resource
            refreshData(`${camelize(type)}List`);
            // refresh activity list
            refreshData("activitiesList");

            complete();
          } else if (updatedTransaction.status == "processing_failed") {
            complete();
            console.log("Processing Failed");
          } else if (
            updatedTransaction.metadata.threeDSecure &&
            updatedTransaction.metadata.threeDSecure.required &&
            !threeDScomplete
          ) {
            console.log("Triggering 3DS2");

            console.log(threeDS2Options);
            await window.client.triggerThreeDSecure(
              updatedTransaction,
              threeDS2Options
            );
            threeDScomplete = true;
            next();
          } else {
            next();
          }
        },
        error: (error) => console.log(error),
        timeout: () => {
          console.log("Transaction polling timed out.");

          // Transaction always times out for now, so treat it like success.
          // hide modal
          hideElement(modalID);
          // refresh resource
          refreshData(`${camelize(type)}List`);
          // refresh activity list
          refreshData("activitiesList");
        },
      });
    })
    .catch((error) => {
      console.log(error);
      showModalErrors(
        modalID,
        "An error ocurred.  Check the console for details."
      );
    });
}

function createResource(params, modalID, threeDS2Options) {
  let type = params.type;
  window.client
    .create(params)
    .then((response) => {
      if (!response.success) {
        // show errors
        showModalErrors(
          modalID,
          "An error ocurred.  Check the console for details."
        );
      } else {
        console.log(response);
        if (type == "accounts") {
          window.client.poll("accounts", response.resource.id, {
            update: async (updatedAccount, next, complete) => {
              console.log("Received updated account");
              console.log(updatedAccount);

              if (updatedAccount.status == "active") {
                // hide modal
                hideElement(modalID);
                // refresh resource
                refreshData(`${camelize(type)}List`);
                // refresh activity list
                refreshData("activitiesList");

                complete();
              } else if (updatedAccount.status == "invalid") {
                console.log("Authentication Failed");
                // hide modal
                hideElement(modalID);
                // refresh resource
                refreshData(`${camelize(type)}List`);
                // refresh activity list
                refreshData("activitiesList");

                complete();
              } else if (
                updatedAccount.metadata.threeDSecure &&
                updatedAccount.metadata.threeDSecure.required
              ) {
                console.log("Triggering 3DS2");

                console.log(threeDS2Options);
                await window.client.triggerThreeDSecure(
                  updatedAccount,
                  threeDS2Options
                );
                next(0);
              } else {
                next();
              }
            },
            error: (error) => console.log(error),
            timeout: () => console.log("Account polling timed out."),
          });
        } else {
          // hide form
          hideElement(modalID);
          // refresh resource
          refreshData(`${camelize(type)}List`);
          // refresh activity list
          refreshData("activitiesList");
        }
      }
    })
    .catch((error) => {
      console.log("Request failed:");
      console.log(error);
    });
}

function updateResource(params, modalID, threeDS2Options) {
  let type = params.type;
  window.client
    .update(params)
    .then((response) => {
      if (!response.success) {
        // show errors
        showModalErrors(
          modalID,
          "An error ocurred.  Check the console for details."
        );
      } else {
        console.log(response);
        let threeDScomplete = false;
        if (type == "accounts") {
          window.client.poll("accounts", response.resource.id, {
            update: async (updatedAccount, next, complete) => {
              console.log("Received updated account");
              console.log(updatedAccount);

              if (
                updatedAccount.metadata.threeDSecure &&
                updatedAccount.metadata.threeDSecure.required &&
                !threeDScomplete
              ) {
                console.log("Triggering 3DS2");

                console.log(threeDS2Options);
                await window.client.triggerThreeDSecure(
                  updatedAccount,
                  threeDS2Options
                );
                threeDScomplete = true;
                next();
              } else {
                // Keep polling in case 3DSecure is required on next update.
                next();
              }
            },
            error: (error) => console.log(error),
            timeout: () => {
              // Either 3DSecure is complete or wasnt required.
              console.log("Account polling timed out.");
              // hide modal
              hideElement(modalID);
              // refresh resource
              refreshData(`${camelize(type)}List`);
              // refresh activity list
              refreshData("activitiesList");
            },
          });
        } else {
          // hide form
          hideElement(modalID);
          // refresh resource
          refreshData(`${camelize(type)}List`);
          // refresh activity list
          refreshData("activitiesList");
        }
      }
    })
    .catch((error) => {
      console.log("Request failed:");
      console.log(error);
    });
}

function camelize(str) {
  let newStr = "";
  newStr = str
    .split("-")
    .map((el, ind) => {
      return ind && el.length ? el[0].toUpperCase() + el.substring(1) : el;
    })
    .join("");
  return newStr;
}

function modelForType(type) {
  switch (type) {
    case "accounts":
      return Account;
    case "activities":
      return Activity;
    case "addresses":
      return Address;
    case "email-addresses":
      return EmailAddress;
    case "phone-numbers":
      return PhoneNumber;
    case "transactions":
      return Transaction;
  }
}

class Address {
  static createFormToJSON(formParams) {
    return {
      type: "addresses",
      attributes: {
        street1: formParams.street,
        street2: formParams.street2,
        locality: formParams.city,
        region: formParams.state,
        country: formParams.country,
        zipcode: formParams.zip_code,
      },
      relationships: {
        owner: {
          data: {
            type: "profiles",
            id: formParams.profile_id,
          },
        },
      },
    };
  }
}
class Account {
  static createFormToJSON(formParams) {
    let metadata = JSON.parse(formParams.metadata);
    return {
      type: "accounts",
      attributes: {
        nickname: formParams.nickname,
        details: {
          type: "credit-cards",
          "card-number": formParams.cardnumber,
          "cardholder-name": formParams.cardholder_name,
          "billing-address-id": formParams.billing_address_id,
          "expiration-date": formParams.expiration_date,
          cvv: formParams.cvv,
        },
        metadata: metadata,
      },
      relationships: {
        owner: {
          data: {
            type: "profiles",
            id: formParams.profile_id,
          },
        },
      },
    };
  }

  static updateFormToJSON(formParams) {
    let metadata = JSON.parse(formParams.metadata);
    return {
      type: "accounts",
      id: formParams.id,
      attributes: {
        nickname: formParams.nickname,
        details: {
          type: "credit-cards",
          "cardholder-name": formParams.cardholder_name,
          "billing-address-id": formParams.billing_address_id,
          cvv: formParams.cvv,
        },
        metadata: metadata,
      },
    };
  }
}

class Transaction {
  static createFormToJSON(formParams) {
    console.log(formParams);
    let amount = Math.trunc(
      Number(formParams.amount.replace(/[^0-9\.-]+/g, "")) * 100
    );
    let metadata = JSON.parse(formParams.metadata);
    return {
      type: "transactions",
      attributes: {
        "transaction-type": "debit",
        amount: amount,
        precision: 2,
        currency: formParams.currency,
        memo: formParams.memo,
        metadata: metadata,
      },
      relationships: {
        profile: {
          data: {
            type: "profiles",
            id: formParams.profile_id,
          },
        },
        account: {
          data: {
            type: "accounts",
            id: formParams.account_id,
          },
        },
      },
    };
  }
}
