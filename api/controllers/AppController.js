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
		return res.view({});
	},
	/**
   * `AppController.query()`
   */
	query: function(req, res){
		var restify = require('restify');
		var tRexClient = restify.createJsonClient({
			url: "http://52.36.29.146:11080",
			version: '*'
		});
		var data = { names: req.param('names')};
		tRexClient.post('/resolver', data, function(dres, dreq, dres, dobj){
    	res.send(dobj);
  	});
	}
};
