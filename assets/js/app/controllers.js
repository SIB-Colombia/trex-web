angular.module('taxonApp.controllers', []).
controller('taxonController', function($scope, tRexAPIService){
  $scope.info =  [];
  $scope.warning = [];
  $scope.error = [];
  $scope.success = [];
  $scope.queryType = "bioRecords";
  $scope.taxonFilter = null;
  $scope.taxonsList  = [];
  $scope.dataSources = [];
  $scope.selectedDataSources = [];
  $scope.fileReadOutput = null;
  $scope.typeFilter = "general";
  $scope.dataSourcesTitles = [];
  $scope.taxonDetail = {title: null, keyValue: []};
  $scope.pages = [];
  $scope.pageIndex = 0;
  $scope.dataCount = 0;
  $scope.maxPages = 0;
  $scope.listdonwloads = [ "XLSX", "CSV", "TXT"];

  var X = XLSX;

  var drop = document.getElementById('dragNDrop');
  var xlf = document.getElementById('flFile');

  var rABS = true;

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
        if (name.indexOf('.csv') > -1) {
          wb = data.split("\n");
          fileTermsSearch(wb, 'csv');
        } else if (name.indexOf('.xlsx') > -1) {
          wb = X.read(data, {type: 'binary'});
          $scope.fileReadOutput = to_json(wb);
          fileTermsSearch(null, null);
        }
  		};
      if (name.indexOf('.csv') > -1){
            reader.readAsText(f, 'GB18030');
        }else{
            reader.readAsBinaryString(f);
        }
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
        if (name.indexOf('.csv') > -1) {
          wb = data.split("\n");
          fileTermsSearch(wb, 'csv');
        } else if (name.indexOf('.xlsx') > -1) {
          wb = X.read(data, {type: 'binary'});
          $scope.fileReadOutput = to_json(wb);
          fileTermsSearch(null, null);
        }
  		};
      if (name.indexOf('.csv') > -1){
            reader.readAsText(f, 'GB18030');
        }else{
            reader.readAsBinaryString(f);
        }
  	}
  }

  if(xlf.addEventListener) xlf.addEventListener('change', handleFile, false);

  tRexAPIService.tRexDataSourcesExtraData().success(function (res){
    res.forEach(function(v,k){
      $scope.dataSources.push({
        id:v.id,
        title: v.title,
        datasource_type: v.datasource_type,
        lsid: v.lsid,
        lsid_computations: v.lsid_computations,
        classification_path_ranks_unbox: v.classification_path_ranks_unbox
      });
    });
  }).error(function (err) {
    console.log("Error getting data sources");
  });

  $scope.on_search = function (sender){
    $scope.error = [];
    switch (sender) {
      case 'btnSearch':
      case 'txtTerms':
       if ($scope.txtTerms != undefined && $scope.txtTerms.length >= 3){
         if($scope.selectedDataSources.length > 0){
           $scope.processing = true;
           txtTerms_search(sender);
         } else {
           $scope.error.push($scope._getString('warningnoDataSource'));
         }
       } else {
         $scope.error.push($scope._getString('warningnoData'));
       }
        break;
      default:
        break;
    }
  }

  $scope.on_btnDownload_click = function () {
    var type = $scope.ddlDownload;
    if (type == 'XLSX') {
      var ws_name = "results";
      var wb = new Workbook();

      wb.SheetNames.push(ws_name);

      var ws = _sheet_from_array_of_arrays(_generateTable());

      wb.Sheets[ws_name] = ws;

      var wbout = XLSX.write(wb, {bookType:"xlsx", bookSST:true, type:'binary'});

      saveAs(new Blob([_s2ab(wbout)], {type:"application/octect-stream"}), "results.xlsx");
    }
    else if (type == 'CSV') {
      var ws_name = "results";
      var wb = new Workbook();

      wb.SheetNames.push(ws_name);

      var ws = _sheet_from_array_of_arrays(_generateTable());

      wb.Sheets[ws_name] = ws;

      var wbout = to_csv(wb);

      saveAs(new Blob([_s2ab(wbout)], {type:"application/octect-stream"}), "results.csv");
    }
    else if (type == "TXT") {
      var ws_name = "results";
      var wb = new Workbook();

      wb.SheetNames.push(ws_name);

      var ws = _sheet_from_array_of_arrays(_generateTable());

      wb.Sheets[ws_name] = ws;

      var wbout = to_csv(wb).replace(/,/g, '\t');;

      saveAs(new Blob([_s2ab(wbout)], {type:"application/octect-stream"}), "results.txt");
    }

  }

  $scope.on_clean = function() {
    $scope.txtTerms = "";
    $scope.warning = [];
    $scope.error = [];
    $scope.info = [];
    $scope.taxonsList = [];
  };

  $scope.on_details = function(d) {
    $scope.taxonDetail.title    = emptyStrIfNull($scope.taxonsList[d].scientificName);
    $scope.taxonDetail.keyValue = emptyStrIfNull($scope.taxonsList[d].raw_response);
    // Adding taxon hiearchy to raw_response
    $scope.taxonDetail.keyValue.kingdom = emptyStrIfNull($scope.taxonsList[d].kingdom);
    $scope.taxonDetail.keyValue.phylum = emptyStrIfNull($scope.taxonsList[d].phylum);
    $scope.taxonDetail.keyValue.order = emptyStrIfNull($scope.taxonsList[d].order);
    $scope.taxonDetail.keyValue.phylum = emptyStrIfNull($scope.taxonsList[d].class);
    $scope.taxonDetail.keyValue.family = emptyStrIfNull($scope.taxonsList[d].family);
    $scope.taxonDetail.keyValue.genus = emptyStrIfNull($scope.taxonsList[d].genus);
    $scope.taxonDetail.keyValue.species = emptyStrIfNull($scope.taxonsList[d].species);
    $scope.taxonDetail.keyValue.subspecies = emptyStrIfNull($scope.taxonsList[d].subspecies);
    $scope.taxonDetail.keyValue.specificEpithet = emptyStrIfNull($scope.taxonsList[d].specificEpithet);
    $scope.taxonDetail.keyValue.infraSpecificEpithet = emptyStrIfNull($scope.taxonsList[d].infraSpecificEpithet);
    // Adding LSID detail to details view
    $scope.taxonDetail.keyValue.lsid = emptyStrIfNull($scope.taxonsList[d].lsid);
  };

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
        if(key != '$$hashKey' && key != 'raw_response' && key != 'has_url' && key != 'has_results'){
          if (i == 0) {
            headers.push($scope._getString(key));
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

  function fileTermsSearch (array, type) {
    var terms;
    if (type == 'csv') {
      terms = array;
    } else {
      terms = fileOutputParse();
    }

    $scope.error = [];
    $scope.warning = [];
    if ($scope.selectedDataSources.length > 0) {
      if (terms.length > 0) {
        if (terms.length <= 10000) {
          $scope.processing = true;
          $scope.taxonsList = [];
          // Query the API each 700 items
          var chunks = Array.chunk(terms, 700);
          for (var c in chunks) {
            var req = { names: chunks[c].join("|"), data_source_ids: $scope.selectedDataSources.join("|")};
            tRexAPIService.searchTaxons(req).success(taxonSearch_success).error(taxonSearch_error);
          }
        } else {
          $scope.$apply(function() {
            $scope.error.push($scope._getString('errorFileTooBig'));
          });
        }
      } else {
        $scope.$apply(function() {
          $scope.error.push($scope._getString('errorNoTermsOnFile'));
        });
      }
    } else {
      $scope.$apply(function() {
        $scope.warning.push($scope._getString('warningnoDataSource'));
      });
    }
  }

  $scope.getSelectedDataSources = function() {
    return $scope.selectedDataSources;
  };

  $scope.check = function(value, checked) {
    var idx = $scope.selectedDataSources.indexOf(value.id);
    if (idx >= 0 && !checked) {
      $scope.selectedDataSources.splice(idx, 1);
    }
    if (idx < 0 && checked) {
      $scope.selectedDataSources.push(value.id);
    }
    $scope.dataSourcesTitles = [];
    for (var sds in $scope.selectedDataSources) {
      for(var ds in $scope.dataSources) {
        if ($scope.dataSources[ds].id == $scope.selectedDataSources[sds]){
          $scope.dataSourcesTitles.push($scope.dataSources[ds].title);
          break;
        }
      }
    }
  };

  function taxonSearch_success(res) {
    if (res != null && res.data != null && res.data.length > 0) {
      $scope.taxonsList = [];
      res.data.forEach(function(v, k) {
        if(v.results != undefined && v.results.length > 0) {
          var taxonRanks =  [ ];
          var taxonClassifications = { };
          var taxonRank = { };
          var data_source_obj = null;
          var temp_lsid = null;
          for(var k in v.results) {
            // Compute taxon hiearchy
            for(var i in $scope.dataSources) {
              if ($scope.dataSources[i].id == v.results[k].data_source_id) {
                if (($scope.dataSources[i].classification_path_ranks_unbox != undefined
                  && $scope.dataSources[i].classification_path_ranks_unbox != null)
                  || ($scope.dataSources[i].lsid_computations != undefined
                    && $scope.dataSources[i].lsid_computations != null)) {
                  data_source_obj = $scope.dataSources[i];
                }
                break;
              }
            }

            taxonClassifications = _getTaxonClassification(
                  data_source_obj != null && data_source_obj.classification_path_ranks_unbox != null ? v.results[k].classification_path.split(data_source_obj.classification_path_ranks_unbox.separator) : null
                , data_source_obj != null && data_source_obj.classification_path_ranks_unbox != null ? data_source_obj.classification_path_ranks_unbox.indexes : null);

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

            taxonRank = $scope._getString(_getTaxonRank(taxonRanks));

            // Compute LSID
            if (data_source_obj != null && data_source_obj.lsid != undefined) {
              temp_lsid = compute_lsid(data_source_obj, v.results[k]);
              //temp_lsid = data_source_obj.lsid + "" + v.results[k][data_source_obj.lsid_param];
            }

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
              , match: $scope._getString(v.is_known_name)
              , url: v.results[k].url
              , lsid: temp_lsid
              , has_url: v.results[k].url != undefined
              , match_type: $scope._getString('match_type' + v.results[k].match_type)
              , data_source_id: v.results[k].data_source_id
              , gni_uuid: v.results[k].gni_uuid
              , canonical_form: v.results[k].canonical_form
              , classification_path: v.results[k].classification_path
              , taxon_id: v.results[k].taxon_id
              , global_id: v.results[k].global_id
              , local_id: v.results[k].local_id
              , prescore: v.results[k].prescore
              , score: v.results[k].score
              , status: v.results[k].status
              , raw_response: v.results[k]
              , has_results: true
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
            , match: $scope._getString(v.is_known_name)
            , url: null
            , lsid: null
            , has_url: false
            , data_source_id: null
            , match_type: null
            , gni_uuid: null
            , canonical_form: null
            , classification_path: null
            , taxon_id: null
            , global_id: null
            , local_id: null
            , prescore: null
            , score: null
            , status: null
            , raw_response: null
            , has_results: false
          });
        }
      });
      var data = $scope.taxonsList;
      $scope.pages = Array.chunk(data, 10);
      $scope.maxPages = $scope.pages.length;
      $scope.pageIndex = 0;
      $scope.dataCount = data.length;
      $scope.processing = false;
    }
  }

  function taxonSearch_error(res){
    console.log('ERROR on txtTerms_search');
    $scope.processing = false;
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

  function _getTaxonClassification(path, indexes){
    //looking for ['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species', 'subspecies'];
    var returnObj = {
      kingdom: null,
      phylum: null,
      class: null,
      order: null,
      family: null,
      genus: null,
      species: null,
      subspecies: null,
      specificEpithet: null,
      infraSpecificEpithet: null,
    };

    if ((path != undefined && path != null) || (indexes != undefined && indexes != null)) {
      returnObj = {
        kingdom: indexes.kingdom >= 0 ? path[indexes.kingdom]: null,
        phylum: indexes.phylum >= 0 ? path[indexes.phylum]: null,
        class: indexes.class >= 0 ? path[indexes.class]: null,
        order: indexes.order >= 0 ? path[indexes.order]: null,
        family: indexes.family >= 0 ? path[indexes.family]: null,
        genus: indexes.genus >= 0 ? path[indexes.genus]: null,
        species: indexes.species >= 0 ? path[indexes.species]: null,
        subspecies: indexes.subspecies >= 0 ? path[indexes.subspecies]: null,
        specificEpithet: indexes.specificEpithet >= 0 ? path[indexes.specificEpithet]: null,
        infraSpecificEpithet: indexes.infraSpecificEpithet >= 0 ? path[indexes.infraSpecificEpithet]: null,
      };
    }

    return returnObj;
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

  $scope._getString = function (key) {
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
      "infraSpecificEpithet": "epíteto infraespecífico",
      "true": "si",
      "false": "no",
      "match_type1": "Coincidencia exacta",
      "match_type2": "Coincidencia exacta del nombre canónico",
      "match_type3": "Coincidencia aproximada del nombre canónico",
      "match_type4": "Coincidencia exacta de partes del nombre",
      "match_type5": "Coincidencia aproximada de partes del nombre",
      "match_type6": "Coincidencia exacta del Género o partes del nombre",
      "warningnoDataSource": "Debe seleccionar al menos una fuente de información",
      "warningnoData": "No hay datos para procesar, ingrese terminos o cargue un archivo",
      "errorNoTermsOnFile": "Error, el archivo no tiene terminos para consultar",
      "errorFileTooBig": "Error, el archivo tiene más de 10000 términos para consultar, intente realizar sus consultas en grupos de 10000",
      "supplied_name_string": "cadena_entrada",
      "taxonRank": "rango_taxon",
      "author": "autor",
      "scientificName": "nombre_cientifico",
      "data_source_title": "titulo_fuente",
      "score": "puntaje",
      "match": "match",
      "id": "id",
      "url": "url",
      "data_sources": "fuente_datos",
      "context": "contexto",
      "context_data_source_id": "fuente_datos_contexto_id",
      "context_clade": "contexto_clado",
      "data": "dato",
      "supplied_name_string": "nombre_cadena_entregada",
      "is_known_name": "es_nombre_conocido",
      "supplied_id": "id_entregado",
      "results": "resultados",
      "data_source_id": "fuente_datos_id",
      "gni_uuid": "uuid_gni",
      "name_string": "nombre_cadena",
      "canonical_form": "forma_canonica",
      "classification_path": "ruta_clasificacion",
      "classification_path_ranks": "rango_ruta_clasificacion",
      "classification_path_ids": "ids_ruta_clasificacion",
      "taxon_id": "id_taxon",
      "local_id": "id_local",
      "global_id": "id_global",
      "match_type": "tipo_match",
      "prescore": "pre_puntaje",
      "score": "puntaje",
      "status": "estatus",
      "status_message": "mensaje_estatus",
      "edit_distance": "distancia_editar",
      "current_taxon_id": "id_actual_taxon",
      "current_name_string": "nombre_cadena_actual"
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
      "match_type1": "Exact Matching",
      "match_type2": "Exact Matching of Canonical Forms",
      "match_type3": "Fuzzy Matching of Canonical Forms",
      "match_type4": "Exact Matching of Specific Parts of Names",
      "match_type5": "Fuzzy Matching of Specific Parts of Names",
      "match_type6": "Exact Matching of Genus Part of Names",
      "warningnoDataSource": "You must select at least one datasource",
      "warningnoData": "No data to process, input terms or upload a file",
      "errorNoTermsOnFile": "Error, no terms on file",
      "errorFileTooBig": "Error, the file contains more than 10000 terms, try again in groups of 10000",
      "taxonRank": "taxon_rank",
      "author": "author",
      "scientificName": "scientific_name",
      "data_source_title": "data_source_title",
      "match": "match",
      "id": "id",
      "url": "url",
      "data_sources": "data_sources",
      "context": "context",
      "context_data_source_id": "context_data_source_id",
      "context_clade": "context_clade",
      "data": "data",
      "supplied_name_string": "supplied_name_string",
      "is_known_name": "is_known_name",
      "supplied_id": "supplied_id",
      "results": "results",
      "data_source_id": "data_source_id",
      "gni_uuid": "gni_uuid",
      "name_string": "name_string",
      "canonical_form": "canonical_form",
      "classification_path": "classification_path",
      "classification_path_ranks": "classification_path_ranks",
      "classification_path_ids": "classification_path_ids",
      "taxon_id": "taxon_id",
      "local_id": "local_id",
      "global_id": "global_id",
      "match_type": "match_type",
      "prescore": "prescore",
      "score": "score",
      "status": "status",
      "status_message": "status_message",
      "edit_distance": "edit_distance",
      "current_taxon_id": "current_taxon_id",
      "current_name_string": "current_name_string"
    };

    var result = key;
    var isEs = $scope.lang.indexOf("es") > -1;
    if (isEs){
      result = esTable[key] != undefined ? esTable[key] : key;
    } else {
      result = enTable[key] != undefined ? enTable[key] : key;
    }
    return result;
  };

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

  $scope.nextPage = function () {
    if (($scope.maxPages - 1) > $scope.pageIndex) {
      $scope.pageIndex = $scope.pageIndex + 1;
    }
  };

  $scope.prevPage = function () {
    if (0 < $scope.pageIndex) {
      $scope.pageIndex = $scope.pageIndex - 1;
    }
  };

  function emptyStrIfNull(v) {
    return v != null ? v : '';
  }

  function compute_lsid(o, d) {
    var result = "";
    var results = [];
    var computationsObj = {};
    for (var k in o.lsid_computations) {
      computationsObj = o.lsid_computations[k];
      if (computationsObj.operation == "concat") {
        results.push(o.lsid + d[computationsObj.lsid_param]);
      } else if (computationsObj.operation == "subs") {
        if (computationsObj.replacement.type == "byValue") {
          results.push(d[computationsObj.target.objectKey].replace(
            computationsObj.replacement.targetStr,
            computationsObj.replacement.value
          ));
        }
      }
    }

    result = results.join();
    return result;
  }
});
