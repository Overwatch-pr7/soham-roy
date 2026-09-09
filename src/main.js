import { dialogueData, scaleFactor } from "./constants";
import { k } from "./kaboomCtx";
import { displayDialogue, setCamScale } from "./utils";

k.loadFont("monogram", "/soham-roy/monogram.ttf");

k.loadSprite("spritesheet", "/soham-roy/spritesheet.png", {
    sliceX: 39, //length/frame size(16)
    sliceY: 31, //width/fram size(16)
    anims: {
        "idle-down": 936,
        "walk-down": { from: 936, to: 939, loop: true, speed: 8 },
        "idle-side": 975,
        "walk-side": { from: 975, to: 978, loop: true, speed: 8 },
        "idle-up": 1014,
        "walk-up": { from: 1014, to: 1017, loop: true, speed: 8 },
    },
});

k.loadSprite("map", "/soham-roy/map.png");
k.setBackground(k.Color.fromHex("311047")) //bg template. might change later based on aesthetics

k.scene("main", async () => {  //code for this scene. async cuz fetch() and json() are async!
    const mapData = await (await (fetch("/soham-roy/map.json"))).json()
    const layers = mapData.layers;

    // Score state
    let score = 0;
    const scoredObjects = new Set();

    const map = k.add([k.sprite("map"), k.pos(0), k.scale(scaleFactor)]) //generating map
    const player = k.make([
        k.sprite("spritesheet", { anim: "idle-down" }),
        k.area({ shape: new k.Rect(k.vec2(0, 3), 10, 10), }),//collidable dimensions for player 
        k.body(),//automatic physics properties
        k.anchor("center"),//trial and error with respect to spawn point
        k.pos(),//put data from tiled spawn point
        k.scale(scaleFactor),
        {//properties for the array
            speed: 250,
            direction: "down",
            isInDialogue: false,
        },
        "player", //tag for collision check with onCollide()
    ]);//play around with shape vec coords to see which is best

    //object detection logic and player spawning
    for (const layer of layers) {
        if (layer.name === "boundaries") {
            for (const boundary of layer.objects) {
                map.add([
                    k.area({
                        shape: new k.Rect(k.vec2(0), boundary.width, boundary.height),
                    }),
                    k.body({ isStatic: true }),
                    k.pos(boundary.x, boundary.y),
                    boundary.name,
                ]);

                if (boundary.name) {
                    player.onCollide(boundary.name, () => {
                        player.isInDialogue = true;
                        //DIALOGUE DATA
                        displayDialogue(dialogueData[boundary.name], () => (player.isInDialogue = false));

                        // SCORE LOGIC: Add 10 points for certain objects
                        const scoreObjects = ["kitchenette", "tv", "cs_degree", "plant", "resume_projects", "pc", "library"];
                        if (scoreObjects.includes(boundary.name) && !scoredObjects.has(boundary.name)) {
                            scoredObjects.add(boundary.name);
                            score += 10;
                            document.getElementById("score").innerText = score;

                            // Show floating +10 text above player
                            k.add([
                                k.text("+10", { font: "monogram", size: 32 }),
                                k.pos(player.pos.x, player.pos.y - 20),
                                k.color(255, 255, 255),
                                k.anchor("center"),
                                k.move(k.vec2(0, -1), 50),
                                k.opacity(1),
                                k.lifespan(1, { fade: 0.5 })
                            ]);
                        }
                    });
                }
            }
            continue;
        }

        if (layer.name === "spawnpoint") {
            for (const entity of layer.objects) {
                if (entity.name == "player") {
                    player.pos = k.vec2(
                        (map.pos.x + entity.x) * scaleFactor,
                        (map.pos.y + entity.y) * scaleFactor
                    );
                    k.add(player);
                    continue;
                }
            }
        }
    }

    //cam screen implementation
    setCamScale(k)

    k.onResize(() => {
        setCamScale(k);
    });

    //describes how camera follows the player
    k.onUpdate(() => {
        k.camPos(player.pos.x, player.pos.y + 100); //use worldPos for child objects
    });

    //tap/click logic and animations
    k.onMouseDown((mouseBtn) => {
        if (mouseBtn !== "left" || player.isInDialogue) return;

        const worldMousePos = k.toWorld(k.mousePos());
        player.moveTo(worldMousePos, player.speed);

        //animations
        const mouseAngle = player.pos.angle(worldMousePos);
        const lower = 50;
        const upper = 125;
        if (mouseAngle > lower && mouseAngle < upper) {
            if (player.curAnim() !== "walk-up") player.play("walk-up");
            player.direction = "up";
            return;
        }
        if (mouseAngle < -lower && mouseAngle > -upper) {
            if (player.curAnim() !== "walk-down") player.play("walk-down");//too many if conditions together mess things up. keep em modular.
            player.direction = "down";
            return;
        }
        if (Math.abs(mouseAngle) > upper) {
            player.flipX = false;
            if (player.curAnim() !== "walk-side") player.play("walk-side");
            player.direction = "right";
            return;
        }
        if (Math.abs(mouseAngle) < lower) {
            player.flipX = true;
            if (player.curAnim() !== "walk-side") player.play("walk-side");
            player.direction = "left";
            return;
        }
    });

    k.onMouseRelease(() => {
        if (player.direction === "down") {
            player.play("idle-down");
            return;
        }
        if (player.direction === "up") {
            player.play("idle-up");
            return;
        }
        player.play("idle-side");
    });

    // keyboard controls
    const moveUp = () => {
        if (
            player.isInDialogue ||
            k.isKeyDown("a") || k.isKeyDown("left") ||
            k.isKeyDown("d") || k.isKeyDown("right") ||
            k.isKeyDown("s") || k.isKeyDown("down")
        ) return;
        player.move(0, -player.speed);
        if (player.curAnim() !== "walk-up") player.play("walk-up");
        player.direction = "up";
    };
    const moveDown = () => {
        if (
            player.isInDialogue ||
            k.isKeyDown("a") || k.isKeyDown("left") ||
            k.isKeyDown("d") || k.isKeyDown("right") ||
            k.isKeyDown("w") || k.isKeyDown("up")
        ) return;
        player.move(0, player.speed);
        if (player.curAnim() !== "walk-down") player.play("walk-down");
        player.direction = "down";
    };
    const moveLeft = () => {
        if (player.isInDialogue || k.isKeyDown("d") || k.isKeyDown("right")) return;
        player.move(-player.speed, 0);
        player.flipX = true;
        if (player.curAnim() !== "walk-side") player.play("walk-side");
        player.direction = "left";
    };
    const moveRight = () => {
        if (player.isInDialogue || k.isKeyDown("a") || k.isKeyDown("left")) return;
        player.move(player.speed, 0);
        player.flipX = false;
        if (player.curAnim() !== "walk-side") player.play("walk-side");
        player.direction = "right";
    };

    k.onKeyDown("w", moveUp);
    k.onKeyDown("up", moveUp);
    k.onKeyDown("s", moveDown);
    k.onKeyDown("down", moveDown);
    k.onKeyDown("a", moveLeft);
    k.onKeyDown("left", moveLeft);
    k.onKeyDown("d", moveRight);
    k.onKeyDown("right", moveRight);

    const stopAnim = () => {
        if (
            k.isKeyDown("w") || k.isKeyDown("s") || k.isKeyDown("a") || k.isKeyDown("d") ||
            k.isKeyDown("up") || k.isKeyDown("down") || k.isKeyDown("left") || k.isKeyDown("right")
        ) return;
        if (player.direction === "down") {
            player.play("idle-down");
            return;
        }
        if (player.direction === "up") {
            player.play("idle-up");
            return;
        }
        player.play("idle-side");
    };

    k.onKeyRelease("w", stopAnim);
    k.onKeyRelease("up", stopAnim);
    k.onKeyRelease("s", stopAnim);
    k.onKeyRelease("down", stopAnim);
    k.onKeyRelease("a", stopAnim);
    k.onKeyRelease("left", stopAnim);
    k.onKeyRelease("d", stopAnim);
    k.onKeyRelease("right", stopAnim);
});

k.go("main");
