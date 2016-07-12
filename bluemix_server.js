/* eslint-disable */
Bluemix = {};

OAuth.registerService('bluemix', 2, null, function(query) {

  var data = getAccessToken(query);
  // console.log(data);
  // console.log(JSON.stringify(data, null, 4));
  var accessToken = data.access_token;
  // console.log('access',accessToken);
  var refreshToken = data.refresh_token;
  // console.log('refresh',refreshToken);
  var identity = getIdentity(accessToken);
  // console.log('identity', identity);

  return {
    serviceName: 'bluemix',
    serviceData: {
      id: identity.sub, // rws - using email for Meteor.userId() right now
      accessToken: OAuth.sealSecret(accessToken),
      refreshToken: OAuth.sealSecret(refreshToken),
      email: identity.sub || '',
      username: identity.sub,
      bmprofile: identity,
    },
    options: { profile: { name: identity.sub } }
  };
});

// http://developer.github.com/v3/#user-agent-required
var userAgent = "Meteor";
if (Meteor.release)
  userAgent += "/" + Meteor.release;

var getAccessToken = function (query) {
  var config = ServiceConfiguration.configurations.findOne({service: 'bluemix'});
  if (!config)
    throw new ServiceConfiguration.ConfigError();

  var basicAuth = 'Basic ' + new Buffer(config.clientId + ':' + config.secret).toString('base64');
  var redirectUri = config.redirectUri || OAuth._redirectUri('bluemix', config);
  var response;
  try {
    response = HTTP.post(
      // "https://idaas.ng.bluemix.net/sps/oauth20sp/oauth20/token", {
      // "https://uaa.eu-gb.bluemix.net/oauth/token", {
      "https://idaas.iam.ibm.com/idaas/oidc/endpoint/default/token", {
        headers: {
          Accept: 'application/json',
          "User-Agent": userAgent,
          Authorization: basicAuth
        },
        params: {
          code: query.code,
          client_id: config.clientId,
          client_secret: OAuth.openSecret(config.secret),
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          state: query.state
        }
      });
  } catch (err) {
    throw _.extend(new Error("Failed to complete OAuth handshake with Bluemix. " + err.message), {response: err.response});
  }
  if (response.data.error) { // if the http response was a json object with an error attribute
    throw new Error("Failed to complete OAuth handshake with Bluemix. " + response.data.error);
  } else {
    return response.data;
  }
};

var getIdentity = function (accessToken) {
  try {
    var config = ServiceConfiguration.configurations.findOne({service: 'bluemix'});
    var url = 'https://idaas.iam.ibm.com/idaas/oidc/endpoint/default/introspect';
    var opts = {
      npmRequestOptions: {
        auth: {
          user: config.clientId,
          pass: config.secret,
          sendImmediately: true
        },
        form: {
          token: accessToken
        }
      }
    };
    // var url = "https://uaa.eu-gb.bluemix.net/userinfo?access_token=" + accessToken;
    // var url = "https://idaas.ng.bluemix.net/idaas/resources/profile.jsp?access_token=" + accessToken;
    return JSON.parse(HTTP.post(url, opts).content);
  } catch (err) {
    throw _.extend(new Error("Failed to fetch identity from Bluemix. " + err.message), {response: err.response});
  }
};

Bluemix.retrieveCredential = function(credentialToken, credentialSecret) {
  return OAuth.retrieveCredential(credentialToken, credentialSecret);
};
