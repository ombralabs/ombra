use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum IpChecker {
    #[default]
    #[serde(rename = "auto")]
    Auto,
    #[serde(rename = "ipwhois")]
    IpWhoIs,
    #[serde(rename = "ipapi")]
    IpapiIs,
    #[serde(rename = "ip2location")]
    Ip2Location,
    #[serde(rename = "ip-api")]
    IpApi,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct ProfileNetwork {
    pub direct: bool,
    pub ip_checker: IpChecker,
}
