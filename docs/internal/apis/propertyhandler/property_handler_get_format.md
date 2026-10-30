## Get active properties (filtered by type)

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/byType?type=Boat`
```json
{
    "method": "GET"
}
```

## Get active properties (not filtered by type)

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/all`

When paginating add the following query string parameters to the url.

`lastEvaluatedKeyCreatedAt="Number"`.
`lastEvaluatedKeyId="String"`.

Replace the 'Number' and 'String' with the actual createdAt- and id attributes of the last property in the array.

Example of a paginated request url:

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/all?lastEvaluatedKeyCreatedAt=1&lastEvaluatedKeyId=1`

```json
{
    "method": "GET"
}
```

## Get active properties from a host (filtered by host id)

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/byHostId?hostId=123`
```json
{
    "method": "GET"
}
```

## Get active properties (filtered by a set of given property ids (maximum of 12 ids))

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/set?properties=123,456,789`
```json
{
    "method": "GET"
}
```

## Get active property details (filtered by property id)

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails?property=123`
```json
{
    "method": "GET"
}
```

## Get all your own properties (filtered by Authorization header (AccessToken))

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/hostDashboard/all`
```json
{
    "method": "GET",
    "headers": {
        "Authorization": "String"
    }
}
```

## Get property details (filtered by property id and Authorization header)

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/hostDashboard/single?property=123`
```json
{
    "method": "GET",
    "headers": {
        "Authorization": "String"
    }
}
```

Only the host of the property and the active co-hosts of that host get the property back. A request without a login gets `401`, anyone else gets `403`, a property that does not exist gets `404`, and a request without `property` gets `400`.

## Get all properties of a host (filtered by host id and Authorization header)

`URL: https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/hostDashboard/byHostId?hostId=123`
```json
{
    "method": "GET",
    "headers": {
        "Authorization": "String"
    }
}
```

Co-hosts use this route to load the listings of the host they work for. Only that host and the active co-hosts of that host get the listings back. A request without a login gets `401`, anyone else gets `403`, a request without `hostId` gets `400`, and a host without listings gets `404` with `"No property found."`.