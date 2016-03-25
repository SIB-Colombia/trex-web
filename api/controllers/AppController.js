/**
 * AppController
 *
 * @description :: Server-side logic for managing apps
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

module.exports = {

	/**
   * `AppController.index()`
   */
	index: function(req, res){
		var lang = req.params['lang'];
		if (lang != undefined && sails.config.i18n.locales.indexOf(lang) >= 0) {
			req.setLocale(lang);
		} else {
			lang = 'en';
		}
		return res.view({lang: lang});
	},
	/**
   * `AppController.query()`
   */
	query: function(req, res){
		var restify = require('restify');
		var tRexClient = restify.createJsonClient({
			url: sails.config.connections.trexAPI.url,
			version: '*'
		});
		var data = req.allParams();
		tRexClient.post('/resolver', data, function(dres, dreq, dres, dobj){
    	res.send(dobj);
  	});
	}
};
