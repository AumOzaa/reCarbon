output "instance_id" {
  description = "EC2 instance ID."
  value       = aws_instance.backend.id
}

output "public_ip" {
  description = "Public IP address of the EC2 instance."
  value       = aws_instance.backend.public_ip
}

output "public_dns" {
  description = "Public DNS name of the EC2 instance."
  value       = aws_instance.backend.public_dns
}

output "ssh_command" {
  description = "SSH command for connecting to the EC2 instance."
  value       = "ssh -i <PRIVATE_KEY> ubuntu@${aws_instance.backend.public_ip}"
}

output "api_url" {
  description = "Backend API URL."
  value       = "http://${aws_instance.backend.public_ip}:${var.app_port}"
}


output "elastic_ip" {
  description = "Stable Elastic IP address for the ReCarbon backend."
  value       = aws_eip.backend.public_ip
}
