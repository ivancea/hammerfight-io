terraform {
  required_version = ">= 1.2.0"

  cloud {
    organization = "HammerfightIo"

    workspaces {
      name = "nodes-deployment"
    }
  }

  required_providers {
    git = {
      source  = "metio/git"
      version = "~> 2024.7.19"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0.5"
    }
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.37.0"
    }
  }
}

provider "git" {
}
provider "tls" {
}

provider "hcloud" {
  token = var.hcloud_token
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

