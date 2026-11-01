import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ASSETS_DIR = r"C:\IMP PROJECTS\Medsync\apps\mobile\assets"
IMAGES_DIR = os.path.join(ASSETS_DIR, "images")
os.makedirs(IMAGES_DIR, exist_ok=True)

def draw_medical_emblem(draw, center_x, center_y, size, color=(255, 255, 255)):
    """Draws a crisp modern medical cross + ECG pulse line"""
    # Cross dimensions
    arm_w = int(size * 0.28)
    arm_l = int(size * 0.85)
    r = int(arm_w * 0.35)

    # Vertical bar
    draw.rounded_rectangle(
        [center_x - arm_w // 2, center_y - arm_l // 2,
         center_x + arm_w // 2, center_y + arm_l // 2],
        radius=r,
        fill=color
    )
    # Horizontal bar
    draw.rounded_rectangle(
        [center_x - arm_l // 2, center_y - arm_w // 2,
         center_x + arm_l // 2, center_y + arm_w // 2],
        radius=r,
        fill=color
    )

    # ECG Heart Pulse overlay in brand blue
    pulse_color = (37, 99, 235)
    line_w = max(6, int(size * 0.045))
    pulse_y = center_y
    left_x = center_x - arm_l // 2 + 10
    right_x = center_x + arm_l // 2 - 10

    # Key pulse points
    points = [
        (left_x, pulse_y),
        (center_x - int(size * 0.22), pulse_y),
        (center_x - int(size * 0.14), pulse_y - int(size * 0.12)),
        (center_x - int(size * 0.05), pulse_y + int(size * 0.15)),
        (center_x + int(size * 0.04), pulse_y - int(size * 0.22)),
        (center_x + int(size * 0.12), pulse_y + int(size * 0.10)),
        (center_x + int(size * 0.18), pulse_y),
        (right_x, pulse_y)
    ]
    draw.line(points, fill=pulse_color, width=line_w, joint="curve")

def create_app_icon():
    size = 1024
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded rectangle background with vibrant MedSync royal blue gradient
    # Simulate gradient with concentric/layered rectangles
    for i in range(size):
        ratio = i / size
        r = int(37 * (1 - ratio * 0.35))
        g = int(99 * (1 - ratio * 0.35))
        b = int(235 * (1 - ratio * 0.35))
        draw.line([(0, i), (size, i)], fill=(r, g, b, 255))

    # Mask to rounded squircle for modern icon look
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, size, size], radius=int(size * 0.24), fill=255)
    img.putalpha(mask)

    # Soft ambient glow behind emblem
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([size * 0.2, size * 0.2, size * 0.8, size * 0.8], fill=(255, 255, 255, 45))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=50))
    img.alpha_composite(glow)

    # Draw centered emblem
    emblem_draw = ImageDraw.Draw(img)
    draw_medical_emblem(emblem_draw, size // 2, size // 2, int(size * 0.58))

    path = os.path.join(ASSETS_DIR, "icon.png")
    img.save(path, "PNG")
    print(f"Saved: {path}")

def create_adaptive_icon():
    size = 1024
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Android adaptive icon foreground: safe zone is central 66% (radius ~ 330)
    # Circle background in MedSync blue
    center = size // 2
    r = int(size * 0.33)
    draw.ellipse([center - r, center - r, center + r, center + r], fill=(37, 99, 235, 255))

    # Draw emblem
    draw_medical_emblem(draw, center, center, int(size * 0.42))

    path = os.path.join(ASSETS_DIR, "adaptive-icon.png")
    img.save(path, "PNG")
    print(f"Saved: {path}")

def create_splash_icon():
    size = 1024
    img = Image.new("RGBA", (size, size), (10, 10, 10, 255))
    draw = ImageDraw.Draw(img)

    # Central glowing emblem
    center_x = size // 2
    center_y = int(size * 0.46)
    badge_r = int(size * 0.22)

    # Soft blue glow
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse(
        [center_x - badge_r - 40, center_y - badge_r - 40,
         center_x + badge_r + 40, center_y + badge_r + 40],
        fill=(37, 99, 235, 80)
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=40))
    img.alpha_composite(glow)

    # Blue squircle badge
    badge_draw = ImageDraw.Draw(img)
    badge_draw.rounded_rectangle(
        [center_x - badge_r, center_y - badge_r, center_x + badge_r, center_y + badge_r],
        radius=int(badge_r * 0.38),
        fill=(37, 99, 235, 255)
    )

    # White emblem inside badge
    draw_medical_emblem(badge_draw, center_x, center_y, int(badge_r * 1.3))

    path = os.path.join(IMAGES_DIR, "splash-icon.png")
    img.save(path, "PNG")
    print(f"Saved: {path}")

def create_favicon():
    size = 48
    img = Image.new("RGBA", (size, size), (37, 99, 235, 255))
    draw = ImageDraw.Draw(img)
    draw_medical_emblem(draw, size // 2, size // 2, int(size * 0.65))

    path = os.path.join(ASSETS_DIR, "favicon.png")
    img.save(path, "PNG")
    print(f"Saved: {path}")

if __name__ == "__main__":
    create_app_icon()
    create_adaptive_icon()
    create_splash_icon()
    create_favicon()
    print("All professional MedSync app assets generated successfully!")
