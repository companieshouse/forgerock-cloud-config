function _fromConfig (configItem) {
  var _CONFIG_FIDC_ENDPOINT = _getVariable('esv.c5d3143c84.manualamendpoint');
  var _CONFIG_NOTIFY_EMAIL_ENDPOINT = _getVariable('esv.926416aa96.notifyemailendpoint');
  var _CONFIG_NOTIFY_SMS_ENDPOINT = _getVariable('esv.06d383cb89.notifysmsendpoint');
  var _CONFIG_VALIDATE_SERVICE_SECRET_ENDPOINT = _getVariable('esv.983ec39961.validateservicesecretendpoint');

  const allConfigItems = {
    _ITEM_FIDC_ENDPOINT: _CONFIG_FIDC_ENDPOINT,
    _ITEM_NOTIFY_EMAIL_ENDPOINT: _CONFIG_NOTIFY_EMAIL_ENDPOINT,
    _ITEM_NOTIFY_SMS_ENDPOINT: _CONFIG_NOTIFY_SMS_ENDPOINT,
    _ITEM_VALIDATE_SERVICE_SECRET_ENDPOINT: _CONFIG_VALIDATE_SERVICE_SECRET_ENDPOINT
  };

  return allConfigItems['_ITEM_' + configItem] || ('Unknown config item : ' + configItem);
}
