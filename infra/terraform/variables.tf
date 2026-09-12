variable "aws_region" {
  description = "AWS region where the infrastructure will be created."
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Deployment environment."
  type        = string
  default     = "production"
}

variable "instance_type" {
  description = "EC2 instance type."
  type        = string
  default     = "t3.micro"
}

variable "instance_name" {
  description = "Name of the EC2 instance."
  type        = string
  default     = "recarbon-backend"
}

variable "ssh_key_name" {
  description = "Name of the AWS EC2 key pair."
  type        = string
  default     = "recarbon-backend-key"
}

variable "ssh_public_key" {
  description = "SSH public key used to access the EC2 instance."
  type        = string
  sensitive   = true
}

variable "allowed_ssh_cidr" {
  description = "CIDR allowed to SSH into the EC2 instance. Use your IP/32 for better security."
  type        = string
}

variable "app_port" {
  description = "Port exposed by the Express backend."
  type        = number
  default     = 3000
}
