const fetch = require('node-fetch')

const getSessionToken = async (argv) => {
  const { username, password } = argv
  const { FIDC_URL } = process.env

  // Get session token
  const requestUrl = `${FIDC_URL}/am/json/realms/root/authenticate`

  const topLevelRequestOptions = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    }
  }

  const userRequestBody = {
    authId: null,
    callbacks: [
      {
        type: 'NameCallback',
        output: [
          {
            name: 'prompt',
            value: 'User Name'
          }
        ],
        input: [
          {
            name: 'IDToken1',
            value: username
          }
        ],
        _id: 0
      },
      {
        type: 'PasswordCallback',
        output: [
          {
            name: 'prompt',
            value: 'Password'
          }
        ],
        input: [
          {
            name: 'IDToken2',
            value: password
          }
        ],
        _id: 1
      }
    ]
  }

  const mfaPromptRequestBody = {
    authId: null,
    callbacks: [
      {
        type: 'TextOutputCallback',
        output: [
          {
            name: 'message',
            value: 'message'
          },
          {
            name: 'messageType',
            value: '0'
          }
        ]
      },
      {
        type: 'ConfirmationCallback',
        output: [
          {
            name: 'prompt',
            value: ''
          },
          {
            name: 'messageType',
            value: 0
          },
          {
            name: 'options',
            value: ['Set up']
          },
          {
            name: 'optionType',
            value: -1
          },
          {
            name: 'defaultOption',
            value: 0
          }
        ],
        input: [
          {
            name: 'IDToken2',
            value: 0
          }
        ]
      },
      {
        type: 'HiddenValueCallback',
        output: [
          {
            name: 'value',
            value: 'false'
          },
          {
            name: 'id',
            value: 'skip-input'
          }
        ],
        input: [
          {
            name: 'IDToken3',
            value: 'Skip'
          }
        ]
      },
      {
        type: 'TextOutputCallback',
        output: [
          {
            name: 'message',
            value:
              'var skipContainer = document.createElement("div");skipContainer.style = "width: 100%";skipContainer.innerHTML = "<button id=\'skip-link\' class=\'btn btn-block btn-link\' type=\'submit\'>Skip for now</button>";document.getElementById("skip-input").parentNode.append(skipContainer);document.getElementsByClassName("callback-component").forEach(  function (e) {    var message = e.firstElementChild;    if (message.firstChild && message.firstChild.nodeName == "#text" && message.firstChild.nodeValue.trim() == "message") {      message.align = "center";      message.innerHTML = "<h2 class=\'h2\'>Set up 2-step verification</h2><div style=\'margin-bottom:1em\'>Protect your account by adding a second step after entering your password to verify it\'s you signing in.</div>";    }  })'
          },
          {
            name: 'messageType',
            value: '4'
          }
        ]
      },
      {
        type: 'TextOutputCallback',
        output: [
          {
            name: 'message',
            value:
              'document.getElementById("skip-link").onclick = function() {  document.getElementById("skip-input").value = "Skip";  document.getElementById("loginButton_0").click();  return false;}'
          },
          {
            name: 'messageType',
            value: '4'
          }
        ]
      }
    ]
  }

  try {
    // Get authId from Top-Level realm
    const topLevelResponse = await fetch(requestUrl, topLevelRequestOptions)
    if (topLevelResponse.status > 299) {
      console.log('Error while getting Session Token: top level')
      throw new Error(
        `${topLevelResponse.status}: ${topLevelResponse.statusText}`
      )
    }
    const topLevelResponseJson = await topLevelResponse.json()
    const topLevelAuthId = topLevelResponseJson.authId

    // Use authId and credentials to get a session token
    userRequestBody.authId = topLevelAuthId
    const userRequestOptions = {
      ...topLevelRequestOptions,
      body: JSON.stringify(userRequestBody)
    }

    const userResponse = await fetch(requestUrl, userRequestOptions)
    if (userResponse.status > 299) {
      console.log('Error while getting Session Token: user')
      throw new Error(`${userResponse.status}: ${userResponse.statusText}`)
    }

    // Use user authId to skip 2-step verification prompt
    const userResponseJson = await userResponse.json()
    const userAuthId = userResponseJson.authId

    mfaPromptRequestBody.authId = userAuthId
    const mfaPromptRequestOptions = {
      ...topLevelRequestOptions,
      body: JSON.stringify(mfaPromptRequestBody)
    }

    const mfaPromptResponse = await fetch(requestUrl, mfaPromptRequestOptions)
    if (mfaPromptResponse.status > 299) {
      console.log('Error while getting Session Token: mfa prompt')
      throw new Error(
        `${mfaPromptResponse.status}: ${mfaPromptResponse.statusText}`
      )
    }

    return Promise.resolve(mfaPromptResponse.headers.get('set-cookie'))
  } catch (error) {
    return Promise.reject(error)
  }
}

module.exports = getSessionToken
