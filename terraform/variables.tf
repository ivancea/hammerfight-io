# Hetzner Cloud
variable "hcloud_token" {
  type      = string
  sensitive = true
}
variable "node_name_prefix" {
  type    = string
  default = "node"
}

# Cloudflare
variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}
variable "cloudflare_zone_id" {
  type      = string
  sensitive = true
}

# ElasticSearch
variable "elastic_cloud_id" {
  type      = string
  sensitive = true
  default   = null
}
variable "elastic_api_key" {
  type      = string
  sensitive = true
  default   = null
}
variable "elastic_index_namespace" {
  type    = string
  default = "hammerfightio"
}

# Hammerfight.io defaults
variable "domain_name" {
  type    = string
  default = "hammerfight.io"
}
