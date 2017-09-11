def verifyToken(token,pemVal):
    try:
        payload = jwt.decode(token, pemVal, algorithms=['RS256'],options={'verify_aud':False})
        print('verified')
        return payload
    except:
        print ('not verified')
        return False

def retrieveTokens(grantCode):
    clientId = service_manager.get('appid')['appid-client-id']
    secret = service_manager.get('appid')['appid-secret']
    tokenEndpoint = service_manager.get('appid')['appid-token-path']
    redirectUri = "http://localhost:5000/redirect"
    r = requests.post(tokenEndpoint, data={"client_id": clientId,"grant_type": "authorization_code","redirect_uri": redirectUri,"code": grantCode
		}, auth=HTTPBasicAuth(clientId, secret))
    print(r.status_code, r.reason)
    if (r.status_code is not 200):
        return 'fail'
    else:
        return r.json()

def handleCallback(grantCode):
    tokens=retrieveTokens(grantCode)
    if (type(tokens) is str):
        return tokens
    else:
        if (tokens['access_token']):
            session[service_manager.get('appid')['appid-context']]=tokens
            return protected()
        else:
            return 'fail'

app.secret_key = 'A0Zr98j/3yX R~XHH!jm3]LWX/,?RT'
@app.route('/protected')
def protected():
    tokens = session.get(service_manager.get('appid')['appid-context'])
    if (tokens):
        publickey = service_manager.get('appid')['appid-context']
        pem = service_manager.get('appid')['appid-pem']
        idToken = tokens.get('id_token')
        accessToken = tokens.get('access_token')
        idTokenPayload = verifyToken(idToken,pem)
        accessTokenPayload =verifyToken(accessToken,pem)
        if (not idTokenPayload or not accessTokenPayload):
            session[service_manager.get('appid')['appid-context']]=None
            return startAuthorization()
        else:
            print('idTokenPayload')
            print (idTokenPayload)
            return 'AUTH'
    else:
        return startAuthorization()


@app.route('/startAuthorization')
def startAuthorization():
    clientId = service_manager.get('appid')['appid-client-id']

    authorizationEndpoint = service_manager.get('appid')['appid-authorization-endpoint']
    redirectUri = 'http://localhost:5000/redirect'
    return redirect("{}?client_id={}&response_type=code&redirect_uri={}&scope=appid_default&idp=appid_anon".format(authorizationEndpoint,clientId,redirectUri))
@app.route('/redirect')
def redirectCallback():
    error = request.args.get('error')
    code = request.args.get('code')
    if error:
        return error
    elif code:
        return handleCallback(code)
    else:
        return '?'