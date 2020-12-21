window.store = {
  profile: {
    addresses: [],
    accounts: [],
    emailAddresses: [],
    phoneNumbers: [],
    activities: [],
    transactions: [],
  },
};

window.addEventListener("DOMContentLoaded", async (event) => {
  await configureProfile();
  refreshData("accountsList");
  refreshData("addressesList");
  refreshData("emailAddressesList");
  refreshData("phoneNumbersList");
  refreshData("activitiesList");
  refreshData("transactionsList");

  setupAddressForm();
});

async function configureProfile() {
  let profileId = getProfileID();
  let apiEndpoint = getApiEndpoint();
  let clientToken = await refreshClientToken(profileId);
  setClientToken(clientToken);
  window.client = OpenTransact.init(clientToken, apiEndpoint);
}

function setupAddressForm() {
  initCountrySelect();
  window.addEventListener("storeUpdated", function (event) {
    updateBillingAddressSelect(window.store.profile.addresses);
  });
}

async function refreshData(id) {
  let el = document.getElementById(id);
  if (el) {
    let loadingTemplate = el.dataset.loadingTemplate;
    if (loadingTemplate) {
      // show loading
    }

    let type = el.dataset.type;
    let url = el.dataset.dataUrl;
    let key = camelize(type);
    let templateElement = await document.getElementById(`${key}Template`);
    let templateContent = templateElement.innerHTML;
    if (url && templateContent) {
      let data = await fetchResource(url);
      let records = data.data.map((details) => initRecord(details));
      window.store.profile[key] = records;
      window.dispatchEvent(new Event("storeUpdated"));
      let content = Mustache.render(templateContent, {
        data: window.store.profile[key],
      });
      el.innerHTML = content;
    }
  }
}

function initRecord(item) {
  let klass = modelForType(item.type);
  let record = new klass(item);
  return record;
}

async function fetchResource(url) {
  let clientToken = getClientToken();
  let resourceResponse = await fetch(url, {
    headers: {
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${clientToken}`,
    },
  });
  let json = await resourceResponse.json();
  return json;
}

function getProfileID() {
  let el = document.getElementById("profile");
  if (el) {
    return el.dataset.profileId;
  }
}

function getApiEndpoint() {
  let el = document.getElementById("apiEndpoint");
  if (el) {
    return el.dataset.endpoint;
  }
}

function setClientToken(token) {
  let el = document.getElementById("clientToken");
  if (el) {
    el.dataset.clientToken = token;
  }
}

async function refreshClientToken(profileId) {
  let tokenResponse = await fetch(`/profiles/${profileId}/client-token`, {
    method: "POST",
  });

  let data = await tokenResponse.json();
  return data.token;
}

function getClientToken() {
  let el = document.getElementById("clientToken");
  if (el) {
    return el.dataset.clientToken;
  }
}

function initCountrySelect() {
  let template = `<option value="{{alpha2}}">{{name}}</option>`;
  let select = document.getElementById("countrySelect");
  select.addEventListener("change", function (event) {
    updateStateSelect(event.target.value);
  });

  let options = iso3166_1().map((details) => {
    if (details.state == "assigned") {
      return Mustache.render(template, details);
    }
  });

  select.innerHTML = options.join("\n");
  select.value = "US";
  select.dispatchEvent(new Event("change"));
}

function updateStateSelect(country) {
  let template = `<option value="{{alpha2}}">{{name}}</option>`;
  let select = document.getElementById("stateSelect");
  let states = iso3166_2().filter((details) => details.parent == country);
  let options = states.map((details) => {
    let params = {
      alpha2: details.code.slice(-2),
      name: details.name,
    };
    return Mustache.render(template, params);
  });

  select.innerHTML = options.join("\n");
}

function updateBillingAddressSelect(addresses) {
  let template = `<option value="{{id}}">{{name}}</option>`;
  let select = document.getElementById("billingAddressSelect");
  let options = addresses.map((address) => Mustache.render(template, address));
  select.innerHTML = options.join("\n");
}
