resource "hcloud_server" "node-eu" {
  name        = "${var.node_name_prefix}-0"
  location    = "fsn1"
  image       = "debian-12"
  server_type = "cx22"
  user_data = templatefile("initialize-node.sh",
    {
      git_commit              = data.git_commit.current_commit.sha1,
      ssl_certificate         = cloudflare_origin_ca_certificate.tls_cert.certificate,
      ssl_private_key         = tls_private_key.tls_cert_private_key.private_key_pem,
      elastic_cloud_id        = var.elastic_cloud_id,
      elastic_api_key         = var.elastic_api_key,
      elastic_index_namespace = var.elastic_index_namespace,
    }
  )

  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }
}
