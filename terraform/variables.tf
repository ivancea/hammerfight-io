variable "hcloud_token" {
  type      = string
  sensitive = true
}

variable "node_count" {
  type    = number
  default = 1
}

variable "node_name_prefix" {
  type    = string
  default = "node"
}
