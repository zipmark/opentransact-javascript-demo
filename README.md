# OpenTransact Javascript SDK

Current Version: alpha-1

This repository contains a demo of the OpenTransact Javascript SDK and documentation for using the SDK.  The release is currently in an alpha state and the APIs may change.  We will make every effort to communicate changes to anyone using the SDK and/or issue a new version when breaking changes occur.

While support for all objects and interactions in our API are planned, the javascript SDK is currently limited to specific use cases like 3DS2 verification.

## Include the Javascript in your web application

Currently only support via script tags is supported:

```html
<!doctype html>
<html lang="en">

<head></head>
<body>
    <!-- Your application markup here... -->


    <!-- Import OpenTransact Javascript SDK -->
    <script src="https://js.opentransact.com/alpha-1/core.js"> </script>

    <script>
        // Application code and interacting with the SDK here.
    </script>
</body>
```

## Initialize the Client

The client is initialized with a ClientToken obtained by your server from the OpenTransact API.  [See docs here](https://docs.opentransact.com/endpoints/client-tokens/).

```javascript
let client = OpenTransact.init(token)
```

## Fetch Resources from the API for Use in your Application

```javascript
let profileResponse = await client.get('profiles', profileId)
```

## Use form helpers to extract data from forms in your application (*optional)

The client comes with form helpers to help extract data from forms in your application.

You can add an attribute to form fields in the format `data-opentransact-{resource}="{value}"` where resource is the lowercase name of a resource in the OpenTransact API.

Example Form:

```html
<form id="credit-card-form">
    <input type="hidden" name="account-account-type" id="account-account-type"
        data-opentransact-account="account-type" value="credit-cards">

    <input type="hidden" name="account-profile-id" id="account-profile-id"
        data-opentransact-account="profile-id">

    <input type="hidden" name="account-billing-address-id" id="account-billing-address-id"
        data-opentransact-account="billing-address-id">

    <div>
        <label for="account-nickname">Account Nickname</label>

        <input type="text" name="account-nickname" data-opentransact-account="nickname">
    </div>

    <div>
        <label for="account-cardholder">Cardholder Name</label>

        <input type="text" name="account-cardholder"
            data-opentransact-account="cardholder-name">
    </div>

    <div>
        <label for="creditCard">Card Number</label>
        <input type="text" name="account-card-number" id="account-card-number"
            data-opentransact-account="card-number">
    </div>

    <div>
        <label for="cvv">Security Code</label>
        <input type="text" name="cvv" id="cvv" data-opentransact-account="cvv">
    </div>
</form>
```

Example extraction:

```javascript
let account = OpenTransact.extractAddress(form);
```


## Create resources in the API

```javascript
let accountResponse = await client.create(account);
// do something with the response
if (accountResponse.success) { doStuff(accountResponse.resource) }
```

## Trigger a 3DS2 Flow for your Gateway

Currently via the API we support a convention for triggering SCA via the account metadata.

When an account requires 3DS2 SCA to be triggered, the account will have status `'new'` and metadata will have a `threeDS2` key with a value like:

```javascript
{
    required: true,
    ...
}
```

You will then pass this object to the call to `loadThreeDS2` with success and error callbacks:

```javascript
if (account.status === 'new' && account.metadata.threeDS2 && account.metadata.threeDS2.required) {
    OpenTransact.loadThreeDS2(account.metadata.threeDS2, {
                                success: () => pollAccountStatus(account.id),
                                error: (err) => console.log(err)
                            })
}
```

Calling this function will load the appropriate 3DS2 flow for the configured gateway, and update the account with the appropriate info before triggering the complete callback if successful.  You can resume checking to see if the account has moved to 'active' status in this callback.

If 3DS2 verification fails, the error callback will be triggered, and you can inform the user of the failure.

See the [3DS2 Guide](./3DS2_Guide.md) for more info.