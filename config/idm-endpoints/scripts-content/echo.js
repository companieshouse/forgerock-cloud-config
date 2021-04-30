/*
 * Copyright 2013-2019 ForgeRock AS. All Rights Reserved
 *
 * Use of this code requires a commercial software license with ForgeRock AS.
 * or with one of its affiliates. All use shall be exclusively subject
 * to such license between the licensee and ForgeRock AS.
 */
(function(){
    if (request.method === "create") {
        logger.info("[FIND ME] CREATE - bella pe voi");
        return {
            method: "create",
            resourceName: request.resourcePath,
            newResourceId: request.newResourceId,
            parameters: request.additionalParameters,
            content: request.content,
            context: context.current
        };
    } else if (request.method === "read") {
        logger.info("[FIND ME] READ - bella pe voi");
        return {
            method: "read",
            resourceName: request.resourcePath,
            parameters: request.additionalParameters,
            context: context.current,
            bella: "per voi"
        };
    } else if (request.method === "update") {
        return {
            method: "update",
            resourceName: request.resourcePath,
            revision: request.revision,
            parameters: request.additionalParameters,
            content: request.content,
            context: context.current
        };
    } else if (request.method === "patch") {
        return {
            method: "patch",
            resourceName: request.resourcePath,
            revision: request.revision,
            parameters: request.additionalParameters,
            patch: request.patchOperations,
            context: context.current
        };
    } else if (request.method === "query") {
        // query results must be returned as a list of maps
        return [ {
            method: "query",
            resourceName: request.resourcePath,
            pagedResultsCookie: request.pagedResultsCookie,
            pagedResultsOffset: request.pagedResultsOffset,
            pageSize: request.pageSize,
            queryId: request.queryId,
            queryFilter: request.queryFilter.toString(),
            parameters: request.additionalParameters,
            content: request.content,
            context: context.current
        } ];
    } else if (request.method === "delete") {
        return {
            method: "delete",
            resourceName: request.resourcePath,
            revision: request.revision,
            parameters: request.additionalParameters,
            context: context.current
        };
    } else if (request.method === "action") {
        return {
            method: "action",
            action: request.action,
            content: request.content,
            parameters: request.additionalParameters,
            context: context.current
        };
    } else {
        throw { code : 500, message : "Unknown request type " + request.method };
    }
})();