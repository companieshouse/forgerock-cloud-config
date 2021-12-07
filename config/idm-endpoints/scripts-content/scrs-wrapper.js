let logNowMsecs = new Date().getTime();

function _log (message) {
  logger.error('[CHLOG][SCRS-WRAPPER][' + logNowMsecs + '] ' + message);
}

_log('SCRS Scheduled Starting!');

const maxIterations = 3;
const incorporationsPerPage = 50;

for (let iteration = 1; iteration <= maxIterations; iteration++) {
  _log('SCRS Iteration no. ' + iteration + ' starts (max iterations = ' + maxIterations + ')');

  let endpointResponse = openidm.action(
    'endpoint/scrs',
    'read',
    null,
    {
      'numIncorporationsPerPage': incorporationsPerPage
    },
    null);

  if (endpointResponse && endpointResponse.results) {
    _log('SCRS Iteration no. ' + iteration + ' => response :  ' + JSON.stringify(endpointResponse));

    const triedSomeCompanies = endpointResponse.results.companyAttemptCount > 0;
    const allCompaniesFailed = endpointResponse.results.companyFailureCount === endpointResponse.results.companyAttemptCount;

    _log('SCRS Iteration no. ' + iteration + ' => response analysis : triedSomeCompanies = ' + triedSomeCompanies + ', allCompaniesFailed = ' + allCompaniesFailed);

    if (triedSomeCompanies && allCompaniesFailed) {
      // If we tried some (e.g. some were returned by the /submissions request) but all failed we probably have an issue
      _log('All companies failed, stopping iterations (at no. ' + iteration + ' of ' + maxIterations + ') as there may be a potential issue to resolve.');
      break;
    }
  } else {
    // We got no response, so let's not try again for now, instead wait for the next schedule to run
    _log('SCRS Iteration no. ' + iteration + ' returned no response, quitting.');
    break;
  }
}

_log('SCRS Scheduled Ending!');
