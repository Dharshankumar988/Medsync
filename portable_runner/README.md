# MedSync Portable Runner

This directory contains everything you need to run the MedSync backend on your local machine using Docker.

## Requirements
- Docker Desktop (Windows/Mac) or Docker Engine (Linux) installed and running.

## Setup
1. Copy `medsync.env.example` to `medsync.env`.
2. Fill in your credentials in `medsync.env`.

## Usage
- **Start**: Run `start-medsync` (use `.bat` or `.ps1` for Windows, `.sh` for Linux/Mac).
- **Stop**: Run `stop-medsync`.
- **Status**: Run `medsync-status` to see if it's running and healthy.
- **Update**: Run `update-medsync` to pull the latest image and restart.
