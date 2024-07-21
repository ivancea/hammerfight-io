resource "cloudflare_record" "dns-record" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  value   = hcloud_server.node-eu.ipv4_address
  type    = "A"
  ttl     = 1
  proxied = true
  comment = "Created with Terraform, pointing to ${data.git_commit.current_commit.sha1}"
}
