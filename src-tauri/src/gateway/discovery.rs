use mdns_sd::{ServiceDaemon, ServiceInfo};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::OnceCell;

static MDNS_DAEMON: OnceCell<Arc<ServiceDaemon>> = OnceCell::const_new();

#[derive(Debug, Clone, serde::Serialize)]
pub struct ConnectionInfo {
    pub ip: String,
    pub port: u16,
    pub hostname: String,
    pub pairing_url: String,
    pub mdns_name: String,
    pub mdns_url: String,
    pub relay_code: String,
    pub relay_url: String,
}

/// Retrieve the local system's active LAN IPv4 address and pairing connection details.
pub fn get_local_connection_info() -> ConnectionInfo {
    let local_ip = local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string());

    let raw_hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "Downlink-Device".to_string());

    let hostname = raw_hostname.trim_end_matches(".local").to_string();
    let port = 3984;
    let pairing_url = format!("http://{}:{}/mobile", local_ip, port);
    let mdns_name = format!("{}.local", hostname);
    let mdns_url = format!("http://{}:{}/mobile", mdns_name, port);
    let relay_code = crate::gateway::relay::get_room_code_sync();
    let relay_url = format!("https://downlink-web.vercel.app/mobile?ip={}:{}&room={}", local_ip, port, relay_code);

    ConnectionInfo {
        ip: local_ip,
        port,
        hostname,
        pairing_url,
        mdns_name,
        mdns_url,
        relay_code,
        relay_url,
    }
}

/// Starts the Bonjour / mDNS advertisement daemon broadcasting `_downlink._tcp.local.` on LAN.
pub async fn start_mdns_broadcast() -> anyhow::Result<()> {
    MDNS_DAEMON
        .get_or_try_init(|| async {
            let mdns = ServiceDaemon::new()?;
            let info = get_local_connection_info();

            let service_type = "_downlink._tcp.local.";
            let safe_name = info.hostname.replace(' ', "-").replace('.', "-");
            let instance_name = format!("downlink-{}", safe_name);
            let host_name = format!("{}.local.", safe_name);
            let host_ipv4 = &info.ip;
            let port = info.port;

            let mut properties = HashMap::new();
            properties.insert("app".to_string(), "downlink".to_string());
            properties.insert("version".to_string(), env!("CARGO_PKG_VERSION").to_string());
            properties.insert("protocol".to_string(), "1.0".to_string());

            let service_info = ServiceInfo::new(
                service_type,
                &instance_name,
                &host_name,
                host_ipv4,
                port,
                properties,
            )?;

            log::info!(
                "[mDNS/Bonjour] Broadcasting Downlink service: {} at {}:{}",
                instance_name,
                host_ipv4,
                port
            );

            mdns.register(service_info)?;
            Ok::<Arc<ServiceDaemon>, anyhow::Error>(Arc::new(mdns))
        })
        .await?;

    Ok(())
}
