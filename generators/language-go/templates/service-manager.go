package services // fix once we know what package

var services = make(map[string]interface{})

func Get(name string) interface{} {
    return services[name]
}

func GetAssistant() *AssistantV1 {
    return services["assistant"].(*AssistantV1)
}

func Set(name string, service interface{}) interface{} {
    services[name] = service
    return service
}

func GetNames() []string {
    keys := make([]string, len(services))
    for k := range services {
        keys = append(keys, k)
    }
    return keys
}

func GetAll() map[string]interface{} {
    return services
}

