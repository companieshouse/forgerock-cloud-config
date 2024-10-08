( function(){

    const _dbg = "FRDEBUG: deferredBulkOperation ENDPOINT: ";
    var info = function( text, args ) { logger.info( "{}{}: {}", _dbg, text, args ? args : "" ) }, isNonEmptyArray = function (field) { return Array.isArray(field) && field.length};
  
    logger.info("{}Received request:{} for resource path {}.",_dbg,String(request.method).toUpperCase(),request.resourcePath);
    logger.info("{}Parameters: {}.",_dbg,request.additionalParameters);
  
    const scheduledTaskName = "deferredBulkOperationScannerTask";
    const schedulerEndpoint = "scheduler/job";
    const scheduledTask = [ schedulerEndpoint, scheduledTaskName].join('/');
    const taskscannerEndpoint = "taskscanner";
    const objectPath = "managed/bulkOperation";
    const bulkOperationType = "BULK";
  
    const createBulkOperationObject = function( request ) {
  
      // Validate parameters
      if ( !request.content || !( isNonEmptyArray(request.content.objectIds) || (!!request.content.queryFilter) || (!!request.additionalParameters._queryFilter) ) ){
        info("ERROR: Bad request, target objects not specified.");
        return { code : 400, message : "Bad request - target objects not specified." };
      }
      if ( !request.action || !(["patch","delete"].includes(request.action.toLowerCase() ) )) {
        info("ERROR: Unsupported action",request.action || "<none>" );
        return { code : 400, message : "Bad request - unsupported action: " + request.action };
      }
      if ( request.action.toLowerCase() === "patch" && !request.content.field ){
        info("ERROR: no field specified in PATCH" );
        return { code : 400, message : "Bad request - field not specified in PATCH request." };
      }
  
     logger.info("{}ACTION:{} on resource path:{} name:{}.",_dbg,request.action,request.resourcePath,request.resourceName);
  
     // Prepare bulkOperation object to be picked up by the task scanner
     const bulkOperationObject = {
       name: request.additionalParameters.name,
       request: request,
       timeSubmitted: new Date().toISOString(),
       isExpired: false,
       type: bulkOperationType
     };
  
     return openidm.create(
       objectPath,
       null,
       bulkOperationObject
     );
     }
  
    const createOrTriggerTask = function( taskName ) {
  
      const qf = "_id eq \"" + scheduledTaskName + "\"";
      const existingTask = openidm.query( schedulerEndpoint, { _queryFilter: qf } , ["_id"] );
      info("Existing task:", JSON.stringify(existingTask));
  
        // Create task scanner job unless already defined (e.g. via persisted schedule)
       if ( !existingTask.resultCount) {
  
         // this is the actual worker script performing the bulk operation
         const execScript = "\/*\r\n *  Copyright 2012-2023 ForgeRock AS. All Rights Reserved\r\n *\r\n *  DISCLAIMER: This code is provided to you expressly as an example  (\u201CSample Code\u201D).\r\n *  It is the responsibility of the individual recipient user, in his\/her sole discretion,\r\n *  to diligence such Sample Code for accuracy, completeness, security, and final determination for appropriateness of use.\r\n *\r\n *  ANY SAMPLE CODE IS PROVIDED ON AN \u201CAS IS\u201D IS BASIS, WITHOUT WARRANTY OF ANY KIND.\r\n *  FORGEROCK AND ITS LICENSORS EXPRESSLY DISCLAIM ALL WARRANTIES,  WHETHER EXPRESS, IMPLIED, OR STATUTORY,\r\n *  INCLUDING WITHOUT LIMITATION, THE IMPLIED WARRANTIES  OF MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE.\r\n *\r\n *  FORGEROCK SHALL NOT HAVE ANY LIABILITY ARISING OUT OF OR RELATING TO ANY USE, IMPLEMENTATION, INTEGRATION,\r\n *  OR CONFIGURATION OF ANY SAMPLE CODE IN ANY PRODUCTION ENVIRONMENT OR FOR ANY COMMERCIAL DEPLOYMENT(S).\r\n *\r\n *\/\r\n\r\n \/*\r\n  * This script is executed by the task scanner on each qualifying managed\/bulkOperation object, which contains\r\n  * the original request.\r\n  *\r\n  * Note that the task scanner populates the objectID and input variables in the invocation context.\r\n  *\r\n  *\/\r\n\r\n( function(){\r\n\r\n  const _dbg = \"FRDEBUG: deferredBulkOperation EXEC: \";\r\n  const info = function( text, args ) { logger.info( \"{}{}: {}\", _dbg, text, args ? args : \"\" ) }, isNonEmptyArray = function (field) { return Array.isArray(field) && field.length};\r\n\r\n  info(\"Executing task on deferred bulk operation\", objectID);\r\n\r\n  const executeAction = function( request ) {\r\n    \/\/ the original request.content ends up in request.content.object when saving it in the managed object !\r\n    if ( !request.content.object || !( isNonEmptyArray(request.content.object.objectIds) || (!!request.content.object.queryFilter) || (!!request.additionalParameters._queryFilter) ) ){\r\n      info(\"ERROR: Bad request, target objects not specified.\");\r\n      return { code : 400, message : \"Bad request - no valid request content.\" };\r\n    }\r\n    if ( !request.action || !([\"patch\",\"delete\"].includes(request.action.toLowerCase() ) )) {\r\n      info(\"ERROR: Unsupported action\",request.action || \"<none>\" );\r\n      return { code : 400, message : \"Bad request - unsupported action: \" + request.action };\r\n    }\r\n    if ( request.action.toLowerCase() === \"patch\" && !request.content.object.field ){\r\n      info(\"ERROR: no field specified in PATCH\" );\r\n      return { code : 400, message : \"Bad request - field not specified in PATCH request.\" };\r\n    }\r\n\r\n   logger.info(\"{}ACTION:{} on resource path:{} name:{}.\",_dbg,request.action,request.resourcePath,request.resourceName);\r\n\r\n     const objectPath = request.resourcePath || \"managed\/alpha_user\";\r\n     const qf = String(request.additionalParameters._queryFilter || request.content.object.queryFilter || \"\");\r\n\r\n     let objectList = (request.content.object.objectIds || [] ).concat(\r\n       !!qf ? (openidm.query( objectPath , { _queryFilter: qf } , [\"_id\"] ).result || []) : []\r\n     );\r\n\r\n     info(\"Processing objectList with numEntries\", objectList.length);\r\n\r\n     let itemsProcessed = 0;\r\n     let itemsFailed = 0;\r\n\r\n     objectList.forEach( function(item) {\r\n       let objectId = objectPath + '\/' + ( item._id || item );\r\n       switch (request.action) {\r\n         case \"patch\":\r\n           let payload = [\r\n             {\r\n               operation: request.content.object.operation,\r\n               field: request.content.object.field,\r\n               value: request.content.object.value\r\n             }\r\n           ];\r\n           try {\r\n             openidm.patch(\r\n               objectId,\r\n               null,\r\n               payload,\r\n               null,\r\n               [\"_id\"]\r\n             )._id ? itemsProcessed++ : itemsFailed++;\r\n           }\r\n           catch (e) {\r\n           info(\"PATCH operation failed with error\", e);\r\n           itemsFailed++\r\n         }\r\n           break;\r\n\r\n         case \"delete\":\r\n           try {\r\n             openidm.delete( objectId, null, null, [\"_id\"] )._id ? itemsProcessed++ : itemsFailed++ ;\r\n           }\r\n           catch (e) {\r\n             info(\"DELETE operation failed with error\", e);\r\n             itemsFailed++\r\n           }\r\n           break;\r\n       }\r\n     }    );\r\n     \/\/ Update bulkOperation object with completion details\r\n     input.timeCompleted = new Date().toISOString();\r\n     input.status = \"done\";\r\n     input.isExpired = true;\r\n     input.itemsProcessed = itemsProcessed;\r\n     input.itemsFailed = itemsFailed;\r\n\r\n     openidm.update( objectID, null, input);\r\n\r\n   return {\r\n           method: request.method,\r\n           action: request.action,\r\n           resourcePath: objectPath,\r\n           _queryFilter: request.additionalParameters._queryFilter,\r\n           queryFilter: request.content.object.queryFilter,\r\n           itemsProcessed: itemsProcessed,\r\n           itemsFailed: itemsFailed\r\n       };\r\n   }\r\n\r\nif (input.type === \"BULK\") {\r\n  return executeAction( input.request );\r\n} else {\r\n  throw { code : 400, message : \"BULK script launched with wrong operation type: \" + input.type };\r\n}\r\n\r\n\r\n} )();\r\n"
  
         const task = {
           "enabled" : true,
           "type" : "simple",
           "persisted": false,
           "concurrentExecution" : true,
           "invokeService" : "taskscanner",
           "invokeContext" : {
           "waitForCompletion" : false,
           "numberOfThreads" : 1,
           "scan" : {
             "_queryFilter" : "/type eq \"BULK\" AND !(timeStarted pr) AND !(timeCompleted pr)",
             "object" : "managed/bulkOperation",
             "taskState" : {
               "started" : "/timeStarted",
               "completed" : "/timeCompleted"
             },
             "recovery" : {
               "timeout" : "10m"
             }
           },
           "task" : {
             "script" : {
               "type" : "text/javascript",
               "source" : execScript
             }
           }
         }
        }
        info("Creating new task...");
        return openidm.create( schedulerEndpoint, scheduledTaskName, task, null, ["_id"] )._id;
  
     } else {
  
       info("Triggering existing task", scheduledTaskName);
       return openidm.action("taskscanner", "execute", null, { "name" : scheduledTaskName } );
  
     }
   }
  
    const updateSchema = function() {
  
       info("Schema for bulkOperation not found. Updating...");
       const boSchema = {
         name : "bulkOperation",
         type: "object",
         schema : {
             "$schema": "http://forgerock.org/json-schema#",
             "description": "Holds bulkOperations for background processing",
             "icon": "fa-stack-overflow",
             "order": [
                 "name",
                 "timeSubmitted",
                 "timeStarted",
                 "timeCompleted",
                 "status",
                 "itemsProcessed",
                 "itemsFailed",
                 "isExpired",
                 "request",
                 "type"
             ],
             "properties": {
                 "isExpired": {
                     "searchable": false,
                     "title": "Expired",
                     "type": "boolean",
                     "userEditable": true,
                     "viewable": true
                 },
                 "name": {
                     "searchable": true,
                     "title": "Name",
                     "type": "string",
                     "userEditable": true,
                     "viewable": true
                 },
                 "request": {
                     "order": [],
                     "properties": {},
                     "searchable": false,
                     "title": "Request",
                     "type": "object",
                     "userEditable": true,
                     "viewable": true
                 },
                 "status": {
                     "searchable": true,
                     "title": "Status",
                     "type": "string",
                     "userEditable": true,
                     "viewable": true
                 },
                 "itemsProcessed": {
                     "searchable": true,
                     "title": "Items successfully processed",
                     "type": "number",
                     "userEditable": true,
                     "viewable": true
                 },
                 "itemsFailed": {
                     "searchable": true,
                     "title": "Items failed",
                     "type": "number",
                     "userEditable": true,
                     "viewable": true
                 },
                 "timeCompleted": {
                     "searchable": true,
                     "title": "Completion time",
                     "type": "string",
                     "userEditable": true,
                     "viewable": true
                 },
                 "timeStarted": {
                     "searchable": true,
                     "title": "Start Time",
                     "type": "string",
                     "userEditable": true,
                     "viewable": true
                 },
                 "timeSubmitted": {
                     "description": "Time when this bulk request was submitted",
                     "format": null,
                     "isVirtual": false,
                     "searchable": true,
                     "title": "Submission time",
                     "type": "string",
                     "userEditable": true,
                     "viewable": true
                 },
                 "type": {
                     "searchable": true,
                     "title": "Operation type",
                     "description": "Type of bulk request (BULK or BATCH)",
                     "type": "string",
                     "userEditable": true,
                     "viewable": true
                 }
             },
             "required": [],
             "title": "Bulk Operations",
             "type": "object"
         }
       };
       var m = openidm.read("config/managed");
       m.objects.push(boSchema);
  
       try {
         openidm.update("config/managed", null, m);
  
         // await new Promise( (r1) => { setTimeout( () => { r1("DING!!"); }, 3000);  } );
            // Unfortunately, the version of the Rhino engine currently used by IDM does not yet support promises.
            // Therefore, the following schema check will always fail and we cannot update the schema in a
            // completely transparent manner.
  
         if (openidm.read("schema/managed/bulkOperation") ) {
           info("Schema updated & verified successfully.");
         } else {
           info("Schema NOT yet verified");
         }
       }
       catch (e) {
         info("Failed to update schema");
         throw { code : 500, message : "Updating schema with bulkOperation object failed: " + e }
       }
  
     return true;
   }
  
  // Main function
  
  if (request.method === "action") {
  
    if (!openidm.read("schema/managed/bulkOperation")) {
      updateSchema();
      return {
        status: "Schema updated. No operation was scheduled."
      }
     } else {
       var bo = createBulkOperationObject( request );
       info("Created BO object", JSON.stringify(bo));
       info("Create Trigger returned", createOrTriggerTask(scheduledTaskName));
       return bo;
     }
   } else if (request.method === "create") {
     if (!openidm.read("schema/managed/bulkOperation")) {
       updateSchema();
       return {
         status: "Schema updated"
       }
     } else {
       return {
         status: "Schema already updated"
       }
     }
   } else {
    throw { code : 400, message : "Unsupported request type: " + request.method };
  }
  
  }
  )();