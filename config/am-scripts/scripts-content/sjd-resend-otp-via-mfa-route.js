var NodeOutcome = {
  SMS: "sms",
  EMAIL: "email",
  UNKNOWN: "unknown"
};

var mfaRoute = sharedState.get("mfa-route");
logger.error("[SJD MFA ROUTE] Shared State MFA Route = " + mfaRoute);

if ("sms" === mfaRoute) {
  outcome = NodeOutcome.SMS;
} else if ("email" === mfaRoute) {
  outcome = NodeOutcome.EMAIL;
} else {
  outcome = NodeOutcome.UNKNOWN;
}

logger.error("[SJD MFA ROUTE] Outcome = " + outcome);