resource "hcloud_server" "node-eu" {
  name        = "${var.node_name_prefix}-0"
  location    = "fsn1"
  image       = "debian-12"
  server_type = "cx22"
  user_data = templatefile("initialize-node.sh",
    {
      git_commit = data.git_commit.current_commit.sha1
    }
  )

  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }
}
