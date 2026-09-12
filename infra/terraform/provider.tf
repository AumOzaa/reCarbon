provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "reCarbon"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}
