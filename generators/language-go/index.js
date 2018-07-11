'use strict';
const Log4js = require('log4js');
const logger = Log4js.getLogger("generator-service-enablement-golang:language-go");

const toml = require('toml');

const path = require('path');
const Utils = require('../lib/Utils');
const fs = require('fs');

const GENERATE_HERE = "// GENERATE HERE";
const GENERATE_IMPORT_HERE = "// GENERATE IMPORT HERE";

let Generator = require('yeoman-generator');
const scaffolderMapping = require('../resources/scaffolderMapping.json');
const GENERATOR_LOCATION = 'server';
const PATH_MAPPINGS_FILE = "./server/config/mappings.json";
const PATH_LOCALDEV_CONFIG_FILE = "server/localdev-config.json";
const PATH_GIT_IGNORE = "./.gitignore";
const PATH_GOPKG_TOML = "/Gopkg.toml"
const PATH_GOPKG = "Gopkg.toml"

// might need consts for Gopkg appending

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		this.context = opts.context;
		logger.setLevel(this.context.loggerLevel);
		logger.debug("Constructing");
	}

	configuring(){
		this.context.dependenciesFile = "Gopkg.toml";
		this.context.languageFileExt = ".go";
		this.context.generatorLocation = GENERATOR_LOCATION;
		this.context.addDependencies = this._addDependencies.bind(this);
		this.context.addMappings = this._addMappings.bind(this);
		this.context.addLocalDevConfig = this._addLocalDevConfig.bind(this);
		this.context.addReadMe = this._addReadMe.bind(this);
		this.context.addInstrumentation = this._addInstrumentation.bind(this);
	}

	writing() {
		let serviceCredentials,
			scaffolderKey,
			serviceKey;
		this._addDependencies(this.fs.read(this.templatePath() + "/" + this.context.dependenciesFile));

		this.fs.copy(
			this.templatePath() + "/service-manager.go",
			this.destinationPath("./server/services/service-manager.go")
		);

		this.fs.copy(
			this.templatePath() + "/services-index.go",
			this.destinationPath("./server/services/index.go") // what is our services init file? not index.js
		);

		//initializing ourselves by composing with the service generators
		let root = path.join(path.dirname(require.resolve('../app')), '../');
		let folders = fs.readdirSync(root);
		folders.forEach(folder => {
			if (folder.startsWith('service-')) {
				serviceKey = folder.substring(folder.indexOf('-') + 1);
				scaffolderKey = scaffolderMapping[serviceKey];
				serviceCredentials = Array.isArray(this.context.bluemix[scaffolderKey])
					? this.context.bluemix[scaffolderKey][0] : this.context.bluemix[scaffolderKey];
				logger.debug("Composing with service : " + folder);
				try {
					this.context.cloudLabel = serviceCredentials && serviceCredentials.serviceInfo && serviceCredentials.serviceInfo.cloudLabel;
					this.composeWith(path.join(root, folder), {context: this.context});
				} catch (err) {
					/* istanbul ignore next */	//ignore for code coverage as this is just a warning - if the service fails to load the subsequent service test will fail
					logger.warn('Unable to compose with service', folder, err);
				}
			}
		});
	}

	// const PATH_GOPKG_TOML = "/Gopkg.toml"
	// const PATH_GOPKG = "Gopkg.toml"

	_addDependencies(serviceDepdendenciesString) {
		let gopkgTomlPath = this.destinationPath(PATH_GOPKG);
		let gopkgToml = this.fs.read(gopkgTomlPath);
		let content = toml.parse(gopkgToml).constraint;

		// will we ever append more than one constraint?
		let newDepenedency = toml.parse(serviceDepdendenciesString).constraint;

		console.log(newDepenedency)
		//check if it exists
	
		content.forEach(function(dependency) {
			console.log(dependency.name + " and " + newDepenedency.name);
			if (dependency.name === newDepenedency.name) {
				console.log(dependency.name)
				return;
			}
			
		});

		// only append if the dependency does not already exist
		this.fs.append(gopkgTomlPath, serviceDepdendenciesString);

		// TODO: finish this once the IBM Cloud ENV is completed		
	}

	_addMappings(serviceMappingsJSON) {
		let mappingsFilePath = this.destinationPath(PATH_MAPPINGS_FILE);
		this.fs.extendJSON(mappingsFilePath, serviceMappingsJSON);
	}

	_addLocalDevConfig(serviceLocalDevConfigJSON){
		let localDevConfigFilePath = this.destinationPath(PATH_LOCALDEV_CONFIG_FILE);
		this.fs.extendJSON(localDevConfigFilePath, serviceLocalDevConfigJSON);
	}

	// TODO: fix this
	_addInstrumentation(options) {
		options.targetFileName = options.targetFileName.replace(/-/g, "_");

		this.fs.copyTpl(
			options.sourceFilePath,
			this.destinationPath() + "/server/services/" + options.targetFileName,
			this.context
		);

		let servicesInitFilePath = this.destinationPath("./server/services/" + SERVICES_INIT_FILE);
		let indexFileContent = this.fs.read(servicesInitFilePath);

		let module = options.targetFileName.replace(".py", "");
		let importToAdd = "from . import " + module + "\n" + GENERATE_IMPORT_HERE;

		if (this.context.bluemix.backendPlatform.toLowerCase() === 'django'){
			let contentToAdd = "\n\tname, service = " + module + ".getService()\n" +
				"\tservice_manager.set(name, service)\n" + GENERATE_HERE;

			indexFileContent = indexFileContent.replace(GENERATE_HERE, contentToAdd);
			indexFileContent = indexFileContent.replace(GENERATE_IMPORT_HERE, importToAdd);
			this.fs.write(servicesInitFilePath, indexFileContent);
		}else{
			let contentToAdd = "\n\tname, service = " + module + ".getService(app)\n" +
				"\tservice_manager.set(name, service)\n" + GENERATE_HERE;

			indexFileContent = indexFileContent.replace(GENERATE_HERE, contentToAdd);
			indexFileContent = indexFileContent.replace(GENERATE_IMPORT_HERE, importToAdd);
			this.fs.write(servicesInitFilePath, indexFileContent);
		}

	}

	_addReadMe(options){
		this.fs.copy(
			options.sourceFilePath,
			this.destinationPath() + "/docs/services/" + options.targetFileName
		);
	}

	// // TODO: fix this
	// end(){
	// 	// Remove GENERATE_HERE from /server/services/index.js
	// 	let servicesIndexJsFilePath = this.destinationPath("./server/services/index.js");
	// 	let indexFileContent = this.fs.read(servicesIndexJsFilePath);
	// 	indexFileContent = indexFileContent.replace(GENERATE_HERE, "");
	// 	this.fs.write(servicesIndexJsFilePath, indexFileContent);

	// 	// Add PATH_LOCALDEV_CONFIG_FILE to .gitignore
	// 	let gitIgnorePath = this.destinationPath(PATH_GIT_IGNORE);
	// 	if (this.fs.exists(gitIgnorePath)){
	// 		this.fs.append(gitIgnorePath, PATH_LOCALDEV_CONFIG_FILE);
	// 	} else {
	// 		this.fs.write(gitIgnorePath, PATH_LOCALDEV_CONFIG_FILE);
	// 	}

	// 	// add services env to deployment.yaml && cf create-service to pipeline.yaml
	// 	return Utils.addServicesEnvToHelmChartAsync({context: this.context, destinationPath: this.destinationPath()})
	// 		.then(() => Utils.addServicesToPipelineYamlAsync({context: this.context, destinationPath: this.destinationPath()}));
	// }
};




