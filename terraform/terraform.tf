terraform {
  required_version = ">= 1.2.0"

  required_providers {
    git = {
      source  = "metio/git"
      version = "2024.7.19"
    }
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

provider "git" {
}

provider "hcloud" {
  token = var.hcloud_token
}

