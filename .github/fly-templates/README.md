# Fly.io Configuration Templates

This folder contains templates for common application types. Copy the appropriate template to your app folder and customize it.

## Available Templates

- `node-template.toml` - For Node.js/Express/Next.js apps
- `python-template.toml` - For Python/Flask/Django apps
- `static-template.toml` - For static HTML/React/Vue sites

## Usage

1. Copy the appropriate template to your app folder:
   ```bash
   cp .github/fly-templates/node-template.toml apps/my-app/fly.toml
   ```

2. Edit `fly.toml` and change:
   - `app` - Must be globally unique across all Fly.io apps
   - `primary_region` - Choose closest to your users ([regions list](https://fly.io/docs/reference/regions/))
   - `internal_port` - Match your app's port
   - `memory_mb` - Based on your needs (256, 512, 1024, 2048)

3. Create a Dockerfile in your app folder if needed

## Common Regions

- `ord` - Chicago, IL (USA)
- `iad` - Ashburn, VA (USA)
- `lhr` - London (UK)
- `fra` - Frankfurt (Germany)
- `nrt` - Tokyo (Japan)
- `syd` - Sydney (Australia)

## First-Time Setup

Before deploying, you need to create the app on Fly.io:

```bash
cd apps/your-app
fly launch  # Creates app and fly.toml interactively
# OR
fly apps create your-app-name  # Just creates the app
```

## Resources

- [Fly.io Documentation](https://fly.io/docs/)
- [Fly.io Pricing](https://fly.io/docs/about/pricing/)
- [Fly.io Regions](https://fly.io/docs/reference/regions/)
