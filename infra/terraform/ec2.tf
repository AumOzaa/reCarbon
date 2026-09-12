resource "aws_instance" "backend" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  subnet_id = data.aws_subnets.default.ids[0]

  key_name = aws_key_pair.backend.key_name

  vpc_security_group_ids = [
    aws_security_group.backend.id
  ]

  user_data = file("${path.module}/user_data.sh")

  user_data_replace_on_change = true

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 12
    encrypted             = true
    delete_on_termination = true
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  monitoring = false

  tags = {
    Name = var.instance_name
  }
}

resource "aws_eip" "backend" {
  domain = "vpc"

  tags = {
    Name = "recarbon-backend-eip"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_eip_association" "backend" {
  instance_id   = aws_instance.backend.id
  allocation_id = aws_eip.backend.id
}

