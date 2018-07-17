package services

import (
  "github.ibm.com/Sydney-Ng/IBM-Cloud-Env-Golang"
  "golang-sdk/assistantV1"
  watson "golang-sdk"
  "errors"
)

func InitializeServiceWatsonAssistant() (*assistantV1.AssistantV1, error) {
  username, ok := IBMCloudEnv.GetString("watson_assistant_username")
  if !ok {
    return nil, errors.New("unable to find watson_assistant_username in IBMCloudEnv")
  }
  password, ok := IBMCloudEnv.GetString("watson_assistant_password")
  if !ok {
    return nil, errors.New("unable to find watson_assistant_password in IBMCloudEnv")
  }
  url, ok := IBMCloudEnv.GetString("watson_assistant_url")
  if !ok {
    return nil, errors.New("unable to find watson_assistant_url in IBMCloudEnv")
  }

  assistant, assistantErr := assistantV1.NewAssistantV1(watson.Credentials{
    ServiceURL: url,
    Version: "2018-02-16",
    Username: username,
    Password: password,
  })

  return assistant, assistantErr
}
