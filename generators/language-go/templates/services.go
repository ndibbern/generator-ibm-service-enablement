package services

import (
  // Service imports
  log "github.com/sirupsen/logrus"
  "github.com/ibm-developer/ibm-cloud-env-golang"
<%  service_imports.forEach(function(serviceimport) { -%>
  "<%- serviceimport %>"
<%   }); -%>
)

var (
  // Service variables
<% service_variables.forEach(function(variable) { -%>
  <%- variable %>
<% }); -%>
)

func Init() {
  IBMCloudEnv.Initialize("server/config/mappings.json")

  // Run service initializers
  var err error
<% services.forEach(function(service) { -%>
  <%- service %>
  if err != nil {
  	log.Fatal(err)
  }
<% }); -%>
}