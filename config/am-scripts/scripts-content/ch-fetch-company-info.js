/* 
  ** INPUT DATA
    * SHARED STATE:
    - 'companyNumber' : the company number we need to lookup 
    - 'implicitConfirmSelection': 
    
    * TRANSIENT STATE
    - 'idmAccessToken' : the IDM Access Token, which can be obtained by executing a scripted decision node configured with the script 'CH - Get IDM Access Token'

  ** OUTPUT DATA
    * SHARED STATE:
    - 'companyData': the company data, result of the lookup
    - 'hashedCredential': the company auth code
    - 'validateMethod': the hashing type ('CHS' for auth codes)
    - [optional] 'errorMessage': error message to display from previous attempts

  ** OUTCOMES
    - true: user confirms to go ahdead with association
    - false: user goes back to company selection, or no company number found in context, auth code not set for company, company cannot be found in IDM, generic error
    - error: IDM token not found
  
  ** CALLBACKS:
    - Output INFO: Display of company information
    - Input: User confirmation if they want to file for this company (YES proceeds to association, NO goes back to company no. prompt)
    - Output ERROR: Error - company number not found
*/

var fr = JavaImporter(
    org.forgerock.openam.auth.node.api.Action,
    javax.security.auth.callback.TextOutputCallback,
    com.sun.identity.authentication.callbacks.HiddenValueCallback,
    javax.security.auth.callback.ConfirmationCallback
)

var NodeOutcome = {
    TRUE: "true",
    FALSE: "false",
    ERROR: "error",
    OTHER_COMPANY: "other"
}

var jurisdictions = {
    EW: "EW", 
    SC: "SC", 
    NI: "NI"
};

var CompanyStatus = {
    ACTIVE: "active", 
    DORMANT: "dormant"
};

function logResponse(response) {
    logger.error("[FETCH COMPANY] Scripted Node HTTP Response: " + response.getStatus() + ", Body: " + response.getEntity().getString());
}

//fetches the IDM access token from transient state
function fetchIDMToken() {
    var ACCESS_TOKEN_STATE_FIELD = "idmAccessToken";
    var accessToken = transientState.get(ACCESS_TOKEN_STATE_FIELD);
    if (accessToken == null) {
        logger.error("[FETCH COMPANY] Access token not in transient state")
        return false;
    }
    return accessToken;
}

// fetch the Company object given a company number
function fetchCompany(idmToken, companyNumber, skipConfirmation) {
    if (companyNumber == null) {
        logger.error("[FETCH COMPANY] No company number in shared state");
        sharedState.put("errorMessage", "No company number in shared state.");
        return {
            success: false,
            message: "No company number in shared state."
        };
    }

    var jurisdiction = sharedState.get("jurisdiction");
    var request = new org.forgerock.http.protocol.Request();

    request.setMethod('GET');
    
    var searchTerm;
        
    // if the user selected Scotland and provided a company number without 'SC' at the beginning, search for a match with either '<company no>' or 'SC<company no>'
    if (jurisdiction.equals(jurisdictions.SC) && companyNumber.indexOf("SC") !== 0) {
        logger.error("[FETCH COMPANY] looking for SC company without 'SC' prefix - adding it");
        searchTerm = "?_queryFilter=(number+eq+%22" + companyNumber + "%22+or+number+eq+%22SC" + companyNumber + "%22)+and+jurisdiction+eq+%22" + jurisdiction + "%22";
    } else {
        //for other jurisdictions, do not make any logic on prefixes
        searchTerm = "?_queryFilter=number+eq+%22" + companyNumber + "%22+and+jurisdiction+eq+%22" + jurisdiction + "%22";
    }    
       
    logger.error("[FETCH COMPANY] Using search term: " + searchTerm);

    request.setUri(idmCompanyEndpoint + searchTerm);
    request.getHeaders().add("Authorization", "Bearer " + idmToken);
    request.getHeaders().add("Content-Type", "application/json");

    var response = httpClient.send(request).get();

    logResponse(response);

    if (response.getStatus().getCode() === 200) {
        logger.error("[FETCH COMPANY] 200 response from IDM");
        var companyResponse = JSON.parse(response.getEntity().getString());

        if (companyResponse.resultCount > 0) {
            var companyStatus = companyResponse.result[0].status;
            var authCode = companyResponse.result[0].authCode;
            var companyName = companyResponse.result[0].name;
            logger.error("[FETCH COMPANY] Got a result: " + JSON.stringify(companyResponse.result[0]));
            logger.error("[FETCH COMPANY] Found authCode: " + authCode);

            if (authCode == null) {
                logger.error("[FETCH COMPANY] No auth code associated with company")
                sharedState.put("errorMessage", "No auth code associated with company " + companyName + ".");
                sharedState.put("pagePropsJSON", JSON.stringify(
                    {
                        'errors': [{
                            label: "No auth code associated with company " + companyName,
                            token: "AUTH_CODE_NOT_DEFINED",
                            fieldName: isEWF ? "IDToken3" : "IDToken2",
                            anchor: isEWF ? "IDToken3" : "IDToken2"
                        }],
                        'company': { name: companyName }
                    }));
                    return {
                        success: false,
                        message: "No auth code associated with company " + companyName + "."
                    };
            }

            logger.error("[FETCH COMPANY] Found status: " + companyStatus);

            if (!companyStatus.equals(CompanyStatus.ACTIVE) && !companyStatus.equals(CompanyStatus.DORMANT)) {
                logger.error("[FETCH COMPANY] The company is not active/dormant")
                sharedState.put("errorMessage", "The company " + companyName + " is not active or dormant.");
                sharedState.put("pagePropsJSON", JSON.stringify(
                    {
                        'errors': [{
                            label: "The company " + companyName + " is not active or dormant.",
                            token: "COMPANY_NOT_ACTIVE",
                            fieldName: isEWF ? "IDToken3" : "IDToken2",
                            anchor: isEWF ? "IDToken3" : "IDToken2"
                        }],
                        'company': { name: companyName }
                    }));
                    return {
                        success: false,
                        message: "The company " + companyName + " is not active or dormant."
                    };
            }

            sharedState.put("companyData", JSON.stringify(companyResponse.result[0]));
            sharedState.put("hashedCredential", authCode);
            sharedState.put("validateMethod", "CHS");

            if (!skipConfirmation) {
                if (callbacks.isEmpty()) {
                    action = fr.Action.send(
                        new fr.HiddenValueCallback(
                            "stage",
                            isEWF ? "EWF_LOGIN_3" : "COMPANY_ASSOCIATION_2"
                        ),
                        new fr.TextOutputCallback(
                            fr.TextOutputCallback.INFORMATION,
                            JSON.stringify(companyResponse.result[0])
                        ),
                        new fr.HiddenValueCallback(
                            "pagePropsJSON",
                            JSON.stringify({ "company": companyResponse.result[0] })
                        ),
                        new fr.ConfirmationCallback(
                            "Do you want to file for this company?",
                            fr.ConfirmationCallback.INFORMATION,
                            ["YES", "NO"],
                            YES_OPTION_INDEX
                        )
                    ).build();
                    return {
                        success: true
                    };
                }
            } else {
                return {
                    success: true
                };
            }
        } else {
            logger.error("[FETCH COMPANY] No company results for company number " + companyNumber);
            sharedState.put("errorMessage", "The company " + companyNumber + " could not be found. " + searchTerm);
            sharedState.put("pagePropsJSON", JSON.stringify(
                {
                    'errors': [{
                        label: "The company ${companyNumber} could not be found.",
                        token: "COMPANY_NOT_FOUND",
                        fieldName: isEWF ? "IDToken3" : "IDToken2",
                        anchor: isEWF ? "IDToken3" : "IDToken2"
                    }],
                    'company': { number: companyNumber }
                }));
                return {
                    success: false,
                    message: "The company " + companyNumber + " could not be found.",
                    searchTerm: searchTerm
                };
        }
    } else {
        logger.error("[FETCH COMPANY] Error while retrieving company with ID " + companyNumber);
        sharedState.put("errorMessage", "Error while retrieving company " + companyNumber + ".");
        sharedState.put("pagePropsJSON", JSON.stringify(
            {
                'errors': [{
                    label: "Error while retrieving company " + companyNumber + ".",
                    token: "COMPANY_FETCH_ERROR",
                    fieldName: isEWF ? "IDToken3" : "IDToken2",
                    anchor: isEWF ? "IDToken3" : "IDToken2"
                }],
                'company': { number: companyNumber }
            }));
            return {
                success: false,
                message: "Error while retrieving company " + companyNumber + "."
            };
    }
}

// main execution flow
var YES_OPTION_INDEX = 0;
var NO_OPTION_INDEX = 1;
var idmCompanyEndpoint = "https://openam-companieshouse-uk-dev.id.forgerock.io/openidm/managed/alpha_organization/";

var skipConfirmation = sharedState.get("skipConfirmation");
var isEWF = sharedState.get("EWF-JOURNEY");

try {
    // if the selection must be confirmed automatically
    if (!skipConfirmation) {
        // if the user has selected to proceed with association or to not go ahead, callbacks will be not empty
        if (!callbacks.isEmpty()) {
            var fileForThiscompanySelection = callbacks.get(3).getSelectedIndex();
            logger.error("[FETCH COMPANY] 'File for this company selection' " + fileForThiscompanySelection);
            if (fileForThiscompanySelection === YES_OPTION_INDEX) {
                logger.error("[FETCH COMPANY] File for this company: selected YES");
                sharedState.put("errorMessage", null);
                sharedState.put("pagePropsJSON", null);
                outcome = NodeOutcome.TRUE;
            } else {
                logger.error("[FETCH COMPANY] File for this company: selected NO");
                sharedState.put("errorMessage", null);
                sharedState.put("pagePropsJSON", null);
                outcome = NodeOutcome.OTHER_COMPANY;
            }
        } else {
            // if the user has started the journey, the callbacks will be empty, then fetch company info    
            var accessToken = fetchIDMToken();
            if (!accessToken) {
                logger.error("[FETCH COMPANY] Access token not in transient state")
                outcome = NodeOutcome.ERROR;
            } else {
                var companyNumber = sharedState.get("companyNumber");
                //fetchCompany can only result in callbacks, does not transition anywhere
                var fetchResult = fetchCompany(accessToken, companyNumber, skipConfirmation);
                if (!fetchResult.success) {
                    outcome = NodeOutcome.FALSE;
                }
            }
        }
    } else {
        logger.error("[FETCH COMPANY] SKIP USER CONFIRMATION")
        var accessToken = fetchIDMToken();
        if (!accessToken) {
            logger.error("[FETCH COMPANY] Access token not in transient state")
            outcome = NodeOutcome.ERROR;
        } else {
            var companyNumber = sharedState.get("companyNumber");
            //fetchCompany can only result in callbacks, does not transition anywhere
            var fetchResult = fetchCompany(accessToken, companyNumber, skipConfirmation);
            if (!fetchResult.success) {
                outcome = NodeOutcome.FALSE;
            } else {
                logger.error("[FETCH COMPANY] company fetched successfully");
                outcome = NodeOutcome.TRUE;
            }
        }
    }
} catch (e) {
    logger.error("[FETCH COMPANY] error " + e);
    sharedState.put("errorMessage", e.toString());
    outcome = NodeOutcome.ERROR;
}