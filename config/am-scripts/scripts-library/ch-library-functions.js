/* Add any useful library functions here ...

If the following commented tags are found in a script, the contents of this file
will be merge between the tags. The reason that the contents are merged rather than
replaced is because if the server-side script happens to be pasted back into this
project file it will safely be replaced with the latest version of the library code when
it is next deployed.

// LIBRARY START
// LIBRARY END

It is also recommended that a global var called _scriptName is declared.

*/

function _getScriptNameForDisplay () {
    return _scriptName ? "[" + _scriptName + "]" : "";
}

function _log (message) {
    logger.error("[CHLOG]".concat(_getScriptNameForDisplay()).concat(" ").concat(message));
}

function _getSelectedLanguage (requestHeaders) {
    var langHeader = "Chosen-Language";

    if (requestHeaders && requestHeaders.get(langHeader)) {
        var lang = requestHeaders.get(langHeader).get(0);
        _log("Selected language: " + lang);
        return lang;
    }
    _log("No selected language found - defaulting to EN");
    return "EN";
}