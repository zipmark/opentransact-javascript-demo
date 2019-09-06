# 3DS2 Guide

This is a brief guide to achieving PSD2 Compliants with 3DS2 SCA on the OpenTransact platform.  We provide a unified API for applications to integrate to which works with 3DS2 support in multiple gateway products.  Please check with your specific gateway provider for specific details about their PSD2 compliance, conditions, and unique features to ensure your application can achieve full compliance with them.

Currently supported gateways:

* BlueSnap

## Steps to Compliance

### Configure Your Application for 3DS2

Contact support@zipmark.com in order to configure processing rules on your account which will enable the following flows to happen automatically for customers who are subject to the requirements of PSD2.

### Implement the OpenTransact Javascript SDK

By convention, the OpenTransact API and Javascript SDK use the meta data object on `Account` and `Transaction` resources to control and trigger flows for 3DS2 SCA.

#### Vaulting Cards

On all forms where customers can add cards to their accounts in your application, you should implement the OpenTransact Javascript SDK.  This SDK will trigger 3DS2 SCA flows based on the configuration for your application with the appropriate gateway for the customer, and communicate status of the SCA within the metadata of the Account object for the SDK to consume.

#### Customer Initiated Transactions

When triggering customer initiated transactions from your application (normal e-commerce transactions), PSD2 requires the SCA flow to be triggered.  Any form that allows a customer to trigger a transaction should be integrated with the SDK as well.

Set the `metadata.threeDS2` key on your transaction to the following value:

```javascript
{
    channel: 'CIT'
}
```

#### Merchant Initiated Transactions

Merchant initiated transactions like fixed fee recurring subscriptions and variable recurring agreements where an appropriate agreement is in place do not require SCA to be peformed for every transaction.  Once the user has successfully vaulted the card and completed SCA you can make future transactions against their card using this mechanism.  Set the `threeDS2` key on `metadata` appropriately in order to skip SCA.

Set the `metadata.threeDS2` key on your transaction to the following value:

```javascript
{
    channel: 'MIT'
}
```

#### Mail Order/Telephone Order Transactions

If you accept payments over the phone or in the mail, mark both the vaulting of the card and the transaction with the appropriate channel in order to skip SCA.  If you want to bill the same customer for a subscription or customer initatied transaction in the past you must trigger the flow at that point.

Set the `metadata.threeDS2` key on your transaction to the following value:

```javascript
{
    channel: 'MOTO'
}
```

#### Exceptions & Grandfathering

Please contact support@zipmark.com with any questions about handling exceptions to the above flows.