(function () {
    var USER_RELATIONSHIP = "memberOfOrg";
    var MAX_INVITE_DURATION_DAYS = 7;
    try {
        logger.info("TASK - REMOVE EXPIRED INVITES - user: {} ({}) : {}", input.mail, objectID);

        var response = openidm.query(
            objectID + "/" + USER_RELATIONSHIP,
            { "_queryFilter": "true" },
            ["_refProperties/membershipStatus"]);

        logger.debug("TASK - REMOVE EXPIRED INVITES - relationships : {}", response);
        let patchPayloads = [];
        if (response.result) {
            response.result.forEach(rel => {
                if ((rel._refProperties.membershipStatus === 'pending') && rel._refProperties.inviteTimestamp) {
                    let inviteDate = new Date(rel._refProperties.inviteTimestamp);
                    let expirydate = new Date(inviteDate.getTime() + (MAX_INVITE_DURATION_DAYS * 24 * 60 * 60 * 1000));
                    let now = new Date();

                    if (expirydate < now) {
                        logger.info("TASK - REMOVE EXPIRED INVITES - INVITE EXPIRED: " + rel._ref);
                        patchPayloads.push(
                            {
                                operation: "remove",
                                field: "/memberOfOrg",
                                value: {
                                    _ref: rel._ref,
                                    _refResourceCollection: rel._refResourceCollection,
                                    _refResourceId: rel._refResourceId,
                                    _refProperties: rel._refProperties
                                }
                            });
                    }
                }
            })
        }

        if (patchPayloads.length > 0) {
            logger.info("TASK - REMOVE EXPIRED INVITES - Removing expired invitations on {} ({})", input.mail, objectID);
            let patchScannerStatus = {
                operation: "remove",
                field: "/frUnindexedString1"
            };
            patchPayloads.push(patchScannerStatus);
            openidm.patch(objectID, null, patchPayloads);
        } else {
            logger.info("TASK - REMOVE EXPIRED INVITES - No expired pending invites found - {} ({})", input.mail, objectID);
        }

    } catch (e) {
        logger.error("TASK - REMOVE EXPIRED INVITES - Error while Removing expired invitations on {} ({}) - {}", input.mail, objectID, e);
    }
}());