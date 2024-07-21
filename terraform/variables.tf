variable "hcloud_token" {
  type      = string
  sensitive = true
}

variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "cloudflare_zone_id" {
  type = string
}

variable "node_name_prefix" {
  type    = string
  default = "node"
}

# Hammerfight.io defaults

variable "domain_name" {
  type    = string
  default = "hammerfight.io"
}
