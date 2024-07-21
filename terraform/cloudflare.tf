resource "tls_private_key" "tls_cert_private_key" {
  algorithm = "RSA"
}

resource "tls_cert_request" "tls_cert_request" {
  private_key_pem = tls_private_key.tls_cert_private_key.private_key_pem

  subject {
    common_name  = "hammerfight.io"
    organization = "Hammerfight.io"
  }
}

resource "cloudflare_origin_ca_certificate" "tls_cert" {
  csr                = tls_cert_request.tls_cert_request.cert_request_pem
  hostnames          = ["hammerfight.io"]
  request_type       = "origin-rsa"
  requested_validity = 90
}

resource "cloudflare_record" "dns-record" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  value   = hcloud_server.node-eu.ipv4_address
  type    = "A"
  ttl     = 1
  proxied = true
  comment = "Created with Terraform, pointing to ${data.git_commit.current_commit.sha1}"
}
