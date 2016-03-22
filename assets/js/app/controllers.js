angular.module('taxonApp.controllers', []).
controller('taxonController', function($scope, tRexAPIService){
  $scope.queryType = "bioRecords";
  $scope.taxonFilter = null;
  $scope.taxonsList  = [];
  $scope.dataSources = [];
  $scope.selectedDataSources = [];
  $scope.fileReadOutput = null;

  $scope.lang = navigator.language || navigator.userLanguage;

  var X = XLSX;
  var XW = {
  	/* worker message */
  	msg: 'xlsx',
  	/* worker scripts */
  	rABS: './xlsxworker2.js',
  	norABS: './xlsxworker1.js',
  	noxfer: './xlsxworker.js'
  };

  var drop = document.getElementById('dragNDrop');
  var xlf = document.getElementById('flFile');

  var rABS = typeof FileReader !== "undefined" && typeof FileReader.prototype !== "undefined" && typeof FileReader.prototype.readAsBinaryString !== "undefined";
  var use_worker = typeof Worker !== 'undefined';
  var transferable = use_worker;
  var wtf_mode = false;

  function fixdata(data) {
  	var o = "", l = 0, w = 10240;
  	for(; l<data.byteLength/w; ++l) o+=String.fromCharCode.apply(null,new Uint8Array(data.slice(l*w,l*w+w)));
  	o+=String.fromCharCode.apply(null, new Uint8Array(data.slice(l*w)));
  	return o;
  }

  function ab2str(data) {
  	var o = "", l = 0, w = 10240;
  	for(; l<data.byteLength/w; ++l) o+=String.fromCharCode.apply(null,new Uint16Array(data.slice(l*w,l*w+w)));
  	o+=String.fromCharCode.apply(null, new Uint16Array(data.slice(l*w)));
  	return o;
  }

  function s2ab(s) {
  	var b = new ArrayBuffer(s.length*2), v = new Uint16Array(b);
  	for (var i=0; i != s.length; ++i) v[i] = s.charCodeAt(i);
  	return [v, b];
  }

  function xw_noxfer(data, cb) {
  	var worker = new Worker(XW.noxfer);
  	worker.onmessage = function(e) {
  		switch(e.data.t) {
  			case 'ready': break;
  			case 'e': console.error(e.data.d); break;
  			case XW.msg: cb(JSON.parse(e.data.d)); break;
  		}
  	};
  	var arr = rABS ? data : btoa(fixdata(data));
  	worker.postMessage({d:arr,b:rABS});
  }

  function xw_xfer(data, cb) {
  	var worker = new Worker(rABS ? XW.rABS : XW.norABS);
  	worker.onmessage = function(e) {
  		switch(e.data.t) {
  			case 'ready': break;
  			case 'e': console.error(e.data.d); break;
  			default: xx=ab2str(e.data).replace(/\n/g,"\\n").replace(/\r/g,"\\r"); console.log("done"); cb(JSON.parse(xx)); break;
  		}
  	};
  	if(rABS) {
  		var val = s2ab(data);
  		worker.postMessage(val[1], [val[1]]);
  	} else {
  		worker.postMessage(data, [data]);
  	}
  }

  function xw(data, cb) {
  	transferable = document.getElementsByName("xferable")[0].checked;
  	if(transferable) xw_xfer(data, cb);
  	else xw_noxfer(data, cb);
  }

  function get_radio_value( radioName ) {
  	var radios = document.getElementsByName( radioName );
  	for( var i = 0; i < radios.length; i++ ) {
  		if( radios[i].checked || radios.length === 1 ) {
  			return radios[i].value;
  		}
  	}
  }

  function to_json(workbook) {
  	var result = {};
  	workbook.SheetNames.forEach(function(sheetName) {
  		var roa = X.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);
  		if(roa.length > 0){
  			result[sheetName] = roa;
  		}
  	});
  	return result;
  }

  function to_csv(workbook) {
  	var result = [];
  	workbook.SheetNames.forEach(function(sheetName) {
  		var csv = X.utils.sheet_to_csv(workbook.Sheets[sheetName]);
  		if(csv.length > 0){
  			result.push("SHEET: " + sheetName);
  			result.push("");
  			result.push(csv);
  		}
  	});
  	return result.join("\n");
  }

  function handleDrop(e) {
  	e.stopPropagation();
  	e.preventDefault();
  	var files = e.dataTransfer.files;
  	var f = files[0];
  	{
  		var reader = new FileReader();
  		var name = f.name;
  		reader.onload = function(e) {
  			var data = e.target.result;
  			var wb;
  			wb = X.read(data, {type: 'binary'});
  			$scope.fileReadOutput = to_json(wb);
        fileTermsSearch();
  		};
  		reader.readAsBinaryString(f);
  	}
  }

  function handleDragover(e) {
  	e.stopPropagation();
  	e.preventDefault();
  	e.dataTransfer.dropEffect = 'copy';
  }

  if(drop.addEventListener) {
  	drop.addEventListener('dragenter', handleDragover, false);
  	drop.addEventListener('dragover', handleDragover, false);
  	drop.addEventListener('drop', handleDrop, false);
  }

  function handleFile(e) {
  	var files = e.target.files;
  	var f = files[0];
  	{
  		var reader = new FileReader();
  		var name = f.name;
  		reader.onload = function(e) {
  			var data = e.target.result;
  			var wb;
  			wb = X.read(data, {type: 'binary'});
        $scope.fileReadOutput = to_json(wb);
        fileTermsSearch();
  		};
  		reader.readAsBinaryString(f);
  	}
  }

  if(xlf.addEventListener) xlf.addEventListener('change', handleFile, false);

  tRexAPIService.gnrDatasources().success(function (res){
    res.forEach(function(v,k){
      $scope.dataSources.push({ id:v.id, title: v.title });
    });
  }).error(function (err) {
    console.log("Error getting data sources");
  });

  $scope.on_search = function (sender){
    $scope.lang = navigator.language || navigator.userLanguage;
    switch (sender) {
      case 'btnSearch':
      case 'txtTerms':
       if ($scope.txtTerms.length >= 3){
         txtTerms_search(sender);
       } else {
         //TODO: display no results
       }
        break;
      default:
        break;
    }
  }

  $scope.on_btnDownload_click = function () {
    var ws_name = "results";
    var wb = new Workbook();

    wb.SheetNames.push(ws_name);

    var ws = _sheet_from_array_of_arrays(_generateTable());

    wb.Sheets[ws_name] = ws;

    var wbout = XLSX.write(wb, {bookType:"xlsx", bookSST:true, type:'binary'});

    saveAs(new Blob([_s2ab(wbout)], {type:"application/octect-stream"}), "results.xlsx");
  }

  function _s2ab(s) {
  	var buf = new ArrayBuffer(s.length);
  	var view = new Uint8Array(buf);
  	for (var i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
  	return buf;
  }

  function _sheet_from_array_of_arrays(data, opts) {
  	var ws = {};
  	var range = {s: {c:10000000, r:10000000}, e: {c:0, r:0 }};
  	for(var R = 0; R != data.length; ++R) {
  		for(var C = 0; C != data[R].length; ++C) {
  			if(range.s.r > R) range.s.r = R;
  			if(range.s.c > C) range.s.c = C;
  			if(range.e.r < R) range.e.r = R;
  			if(range.e.c < C) range.e.c = C;
  			var cell = {v: data[R][C] };
  			if(cell.v == null) continue;
  			var cell_ref = XLSX.utils.encode_cell({c:C,r:R});

  			if(typeof cell.v === 'number') cell.t = 'n';
  			else if(typeof cell.v === 'boolean') cell.t = 'b';
  			else if(cell.v instanceof Date) {
  				cell.t = 'n'; cell.z = XLSX.SSF._table[14];
  				cell.v = datenum(cell.v);
  			}
  			else cell.t = 's';

  			ws[cell_ref] = cell;
  		}
  	}
  	if(range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);
  	return ws;
  }

  function _generateTable() {
    var results = [];
    var row = [];
    var headers = [];
    for (var i = 0;i < $scope.taxonsList.length;i++) {
      row = [];
      for (var key in $scope.taxonsList[i]) {
        if(key != '$$hashKey'){
          if (i == 0) {
            headers.push(key);
          }
          row.push($scope.taxonsList[i][key]);
        }
      }
      results.push(row);
    }
    results.splice(0,0, headers);
    return results;
  }

  function Workbook() {
    if (!(this instanceof Workbook)) return new WorkBook();
    this.SheetNames = [];
    this.Sheets = {};
  }

  function txtTerms_search(sender){
    var terms = $scope.txtTerms.split('\n');
    var req = { };
    if(terms.length > 0) {
      // query each 1000 queries
      if (terms.length > 1000){
        // paging style is needed alert that to the user
        alert('It is only possible to get 1000 on this input');
      } else {
        // query the terms
        req = { names: terms.join('|'), data_source_ids: $scope.selectedDataSources.join('|') };
        tRexAPIService.searchTaxons(req).success(taxonSearch_success).error(taxonSearch_error);
       }
     }
  }

  function fileTermsSearch() {
    var terms = fileOutputParse();
    if (terms.length > 0) {
      $scope.taxonsList = [];
      // Query the API each 700 items
      var chunks = Array.chunk(terms, 700);
      for (var c in chunks) {
        var req = { names: chunks[c].join("|"), data_source_ids: $scope.selectedDataSources.join("|")};
        tRexAPIService.searchTaxons(req).success(taxonSearch_success).error(taxonSearch_error);
      }
    }
  }

  function taxonSearch_success(res) {
    if (res != null && res.data != null && res.data.length > 0) {
      $scope.taxonsList = [];
      res.data.forEach(function(v, k) {
        if(v.results != undefined && v.results.length > 0) {
          var taxonRanks =  [ ];
          var taxonClassifications = { };
          var taxonRank = { };
          console.log(v);
          for(var k in v.results) {
            taxonClassifications = _getTaxonClassification(
                v.results[k].classification_path.split('|')
              , v.results[k].classification_path_ranks.split('|'));

            taxonRanks = [
                taxonClassifications.kingdom != null ? 'kingdom' : null
              , taxonClassifications.phylum != null ? 'phylum' : null
              , taxonClassifications.class != null ? 'class' : null
              , taxonClassifications.order != null ? 'order' : null
              , taxonClassifications.family != null ? 'family' : null
              , taxonClassifications.genus != null ? 'genus' : null
              , taxonClassifications.species != null ? 'species' : null
              , taxonClassifications.subspecies != null ? 'subspecies': null,
              , taxonClassifications.specificEpithet != null ? 'specificEpithet' : null
              , taxonClassifications.infraSpecificEpithet != null ? 'infraspecificEpithet' : null
            ];

            taxonRank = _getString(_getTaxonRank(taxonRanks));

            $scope.taxonsList.push({
                supplied_name_string: v.supplied_name_string
              , kingdom: taxonClassifications.kingdom
              , phylum: taxonClassifications.phylum
              , class: taxonClassifications.class
              , order: taxonClassifications.order
              , family: taxonClassifications.family
              , genus: taxonClassifications.genus
              , species: taxonClassifications.species
              , subspecies: taxonClassifications.subspecies
              , specificEpithet: taxonClassifications.specificEpithet
              , infraSpecificEpithet: taxonClassifications.infraSpecificEpithet
              , taxonRank: taxonRank
              , author: null
              , scientificName: v.results[k].name_string
              , data_source_title: v.results[k].data_source_title
              , score: v.results[k].score
              , match: _getString(v.is_known_name)
              , url: v.results[k].url
              , has_url: v.results[k].url != undefined
              , match_type: _getString('match_type' + v.results[k].match_type)
            });
          }
        } else {
          $scope.taxonsList.push({
              supplied_name_string: v.supplied_name_string
            , kingdom: null
            , phylum: null
            , class: null
            , order: null
            , family: null
            , genus: null
            , species: null
            , subspecies: null
            , specificEpithet: null
            , infraSpecificEpithet: null
            , taxonRank: null
            , author: null
            , scientificName: null
            , data_source_title: null
            , match: _getString(v.is_known_name)
            , url: null
            , has_url: false
          });
        }
      });
    }
  }

  function taxonSearch_error(res){
    console.log('ERROR on txtTerms_search');
  }

  function fileOutputParse() {
    var terms = [];
    if ($scope.fileReadOutput != null && $scope.fileReadOutput != undefined) {
      var headerTag = null;
      for (var k in $scope.fileReadOutput) {
        // The file parser assumes that the header begin on the first row of the file
        headerTag = Object.keys($scope.fileReadOutput[k][0])[0];
        terms.push(headerTag);
        for (var sk in $scope.fileReadOutput[k]) {
          terms.push($scope.fileReadOutput[k][sk][headerTag]);
        }
        // ITERATE ONLY ON THE FIRST SHEET
        break;
      }
    }
    return terms;
  }

  function _getTaxonClassification(path, rank){
    //looking for ['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species', 'subspecies'];
    return {
      kingdom: path[rank.indexOf('kingdom')],
      phylum: path[rank.indexOf('phylum')],
      class: path[rank.indexOf('class')],
      order: path[rank.indexOf('order')],
      family: path[rank.indexOf('family')],
      genus: path[rank.indexOf('genus')],
      species: path[rank.indexOf('species')],
      subspecies: path[rank.indexOf('subspecies')],
      specificEpithet: null,
      infraSpecificEpithet: null
    };
  }

  function _getTaxonRank(taxonRanks) {
    var taxonRanks = taxonRanks.reverse();
    var taxonRank = null;
    for (var i = 0; i < taxonRanks.length; i++) {
      if (taxonRanks[i] != null) {
        taxonRank = taxonRanks[i];
        break;
      }
    }
    return taxonRank;
  }

  function _getString(key) {
    var esTable = {
      "kingdom": "reino",
      "phylum": "filo",
      "class": "clase",
      "order": "orden",
      "family": "familia",
      "genus": "genero",
      "species": "especie",
      "subspecies": "subespecie",
      "specificEpithet": "epíteto específico",
      "infraspecificEpithet": "epíteto infraespecífico",
      "true": "si",
      "false": "no",
      "match_type1": "Match Exacto",
      "match_type2": "Match exactas de forma canónica de un nombre",
      "match_type3": "Match fuzzy de la forma canónica",
      "match_type4": "Parcial Match Exacto por parte de especies de forma canónica",
      "match_type5": "Parcial Match fuzzy por parte de las especies de forma canónica",
      "match_type6": "Match Exacto por parte género de una forma canónica"
    };
    var enTable = {
      "kingdom": "kingdom",
      "phylum": "phylum",
      "class": "class",
      "order": "order",
      "family": "family",
      "genus": "genus",
      "species": "species",
      "subspecies": "subspecies",
      "specificEpithet": "specific epithet",
      "infraspecificEpithet": "infraspecific epithet",
      "true": "true",
      "false": "false",
      "match_type1": "Exact match",
      "match_type2": "Exact match by canonical form of a name",
      "match_type3": "Fuzzy match by canonical form",
      "match_type4": "Partial exact match by species part of canonical form",
      "match_type5": "Partial fuzzy match by species part of canonical form",
      "match_type6": "Exact match by genus part of a canonical form"
    };
    var result = key;
    var isEs = $scope.lang.indexOf("es") > -1;
    if (isEs){
      result = esTable[key];
    } else {
      result = enTable[key];
    }
    return result;
  }

  function chunk (arr, len) {
    var chunks = [],
        i = 0,
        n = arr.length;
    while (i < n) {
      chunks.push(arr.slice(i, i += len));
    }
    return chunks;
  }

  Array.chunk = chunk;
});
