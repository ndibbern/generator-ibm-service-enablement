'use strict';
const Log4js = require('log4js');
const logger = Log4js.getLogger("generator-ibm-service-enablement:language-go");
const path = require('path');
const Utils = require('../lib/Utils');
const fs = require('fs');

let Generator = require('yeoman-generator');
const scaffolderMapping = require('../resources/scaffolderMapping.json');
const GENERATOR_LOCATION = 'server';
const PATH_MAPPINGS_FILE = "./server/config/mappings.json";
const PATH_LOCALDEV_CONFIG_FILE = "server/localdev-config.json";
//const PATH_GIT_IGNORE = "./.gitignore";
const PATH_GOPKG = "Gopkg.toml"
const PATH_GOPKG_TOML = "./Gopkg.toml";


module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts);
		this.context = opts.context;
		logger.setLevel(this.context.loggerLevel);
		logger.debug("Constructing");
	}

	configuring() {
		this.context.addServiceGo = false;
		this.context.service_imports = [];
		this.context.service_variables = [];
		this.context.services = [];
		this.context.dependencies = [];
		this.context.dependenciesFile = "dependencies.toml";
		this.context.languageFileExt = ".go";
		this.context.generatorLocation = GENERATOR_LOCATION;
		this.context.addDependencies = this._addDependencies.bind(this);
		this.context.addMappings = this._addMappings.bind(this);
		this.context.addLocalDevConfig = this._addLocalDevConfig.bind(this);
		this.context.addReadMe = this._addReadMe.bind(this);
		this.context.addInstrumentation = this._addInstrumentation.bind(this);

		let serviceCredentials,
			scaffolderKey,
			serviceKey;
		this._addDependencies(this.fs.read(this.templatePath() + "/" + this.context.dependenciesFile));

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

	// initializing() {
		
	// }

	writing() { 
		// Generate services.go, which acts like a service manager
		if (this.context.addServiceGo) {
			this.fs.copyTpl(
				this.templatePath() + "/services.go",
				this.destinationPath("./services/services.go"),
				this.context
			);
		}

		// Append dependencies to the Gopkg.toml
		let goPkgPath = this.destinationPath(PATH_GOPKG_TOML);
		// Write a Gopkg.toml if one doesn't exist
	  	if (!this.fs.exists(goPkgPath)) {
			this.fs.copy(this.templatePath() + "/" + PATH_GOPKG, this.destinationPath(PATH_GOPKG_TOML));
		}
		this.context.dependencies.forEach((dependency) => {
	    	let fileContentString = this.fs.read(this.destinationPath(PATH_GOPKG));
	     	// Append if not already found
	     	if (fileContentString.indexOf(dependency) === -1) {
	    		this.fs.append(this.destinationPath(PATH_GOPKG), dependency);
	      	}
	    });
	}

	// const PATH_GOPKG_TOML = "./Gopkg.toml"
	// const PATH_GOPKG = "Gopkg.toml"
	_addDependencies(serviceDepdendenciesString) {
		this.context.dependencies.push(serviceDepdendenciesString);
	}

	_addMappings(serviceMappingsJSON) {
		let mappingsFilePath = this.destinationPath(PATH_MAPPINGS_FILE);
		this.fs.extendJSON(mappingsFilePath, serviceMappingsJSON);
	}

	_addLocalDevConfig(serviceLocalDevConfigJSON){
		let localDevConfigFilePath = this.destinationPath(PATH_LOCALDEV_CONFIG_FILE);
		this.fs.extendJSON(localDevConfigFilePath, serviceLocalDevConfigJSON);
	}

	_addInstrumentation(options) {
		function pascalize(name) {
			return name.split('-').map(part => part.charAt(0).toUpperCase() + part.substring(1).toLowerCase()).join('');
		}

		if (this.context.useServices) {
			this.context.useServices();
		}
		
		this.context.addServiceGo = true;
		let extension = path.extname(options.targetFileName);
		let targetName = pascalize(path.basename(options.targetFileName, extension));
		options.targetFileName = options.targetFileName.replace(/-/g, "_");

		// Copy source file
		let targetFilePath = this.destinationPath('services', options.targetFileName);
		this.fs.copyTpl(options.sourceFilePath, targetFilePath, this.context);
		let metaFile = options.sourceFilePath.substring(0, options.sourceFilePath.lastIndexOf("/")) + '/meta.json';
		let metaData = this.fs.readJSON(metaFile);
		let metaImport = metaData.import
	
		// We expect the source file to define a function as an entry point for initialization
		// The function should be available in the module scope and have a name of the form:
		// 'initializeMyService()'. For example, if the targetFileName is 'service-appid.swift'
		// then the function will be 'initializeServiceAppid()'
		// this.context.injectIntoApplication({ service: `try initialize${targetName}()` });

		if (typeof metaImport !== 'undefined') {
			this.context.service_imports.push(`${metaImport}`);
		}
		if (typeof metaData.variableName !== 'undefined' && typeof metaData.type !== 'undefined' && typeof targetName !== 'undefined') {
			this.context.service_variables.push(`${metaData.variableName} *${metaData.type}`);
			this.context.services.push(`${metaData.variableName}, err = Initialize${targetName}()`);
		} else if (typeof targetName !== 'undefined') {
			this.context.services.push(`Initialize${targetName}()`);
		}
	}

	_addReadMe(options){
		this.fs.copy(
			options.sourceFilePath,
			this.destinationPath() + "/docs/services/" + options.targetFileName
		);
	}

	end(){
	// add services env to deployment.yaml && cf create-service to pipeline.yaml
		return Utils.addServicesEnvToHelmChartAsync({context: this.context, destinationPath: this.destinationPath()})
			.then(() => Utils.addServicesToPipelineYamlAsync({context: this.context, destinationPath: this.destinationPath()}));
	}
};
