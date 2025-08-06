class Wall {
    constructor(scene, zPosition, colors) {
        this.mesh = new THREE.Group();
        const wallWidth = 12; // Increased width
        const wallHeight = 12; // Increased height
        const segmentHeight = wallHeight / 4;

        // Create 4 colored segments (vertical arrangement)
        for (let i = 0; i < 4; i++) {
            const segmentGeometry = new THREE.BoxGeometry(wallWidth, segmentHeight, 0.5);
            const segmentMaterial = new THREE.MeshLambertMaterial({
                color: colors[i],
                emissive: colors[i],
                emissiveIntensity: 0.1
            });
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
            // Position segments vertically (raise wall higher)
            segment.position.y = (i - 1.5) * segmentHeight + 6; // Shifted up by 6 units
            segment.castShadow = true;
            segment.receiveShadow = true;
            segment.originalColorIndex = i;
            this.mesh.add(segment);
        }

        this.mesh.position.z = zPosition;
        this.mesh.position.x = 0; // Centered in the ball's path
        this.mesh.rotationSpeed = 0.01; // Slower rotation speed for color movement (was 0.03)
        this.mesh.hasPassed = false; // Track if player has passed this wall

        scene.add(this.mesh);
    }

    get position() {
        return this.mesh.position;
    }

    get children() {
        return this.mesh.children;
    }

    get hasPassed() {
        return this.mesh.hasPassed;
    }

    set hasPassed(value) {
        this.mesh.hasPassed = value;
    }

    get visible() {
        return this.mesh.visible;
    }

    set visible(value) {
        this.mesh.visible = value;
    }

    static checkCollisions(game) {
        const ballPosition = game.ball.position;

        for (let i = game.walls.length - 1; i >= 0; i--) {
            const wall = game.walls[i];
            const wallPosition = wall.position;
            // Check if ball is at the same z-position as the wall
            if (Math.abs(ballPosition.z - wallPosition.z) < 1) {
                // Check if ball is passing through the wall horizontally (now wider)
                if (Math.abs(ballPosition.x - wallPosition.x) < 6) {
                    // Always require the ball color to match the bottom segment (lowest y)
                    const bottomSegment = wall.children[0];
                    const segmentColorIndex = bottomSegment.currentColorIndex !== undefined ?
                        bottomSegment.currentColorIndex : bottomSegment.originalColorIndex;
                    const segmentColor = game.colors[segmentColorIndex];
                    // Check if colors match
                    if (game.ballColor === segmentColor) {
                        if (!wall.hasPassed) {
                            wall.hasPassed = true;
                            // Use destruction effect instead of directly removing
                            game.destroyWall(wall.mesh);
                            // Remove wall after a short delay to allow animation to play
                            setTimeout(() => {
                                game.scene.remove(wall.mesh);
                                game.walls = game.walls.filter(w => w !== wall);
                            }, 600); // Delay matches animation duration
                            game.score += 15;
                            game.updateScore();
                            game.obstaclesPassed++;
                            game.updateAvailableColors();
                            game.changeBallColor();
                        }
                    } else {
                        if (!wall.hasPassed) {
                            wall.hasPassed = true;
                            game.ball.destroy();
                        }
                    }
                }
            }

            // Remove walls that are too far behind and add new ones
            if (wall.position.z > game.ball.position.z + 20) {
                game.scene.remove(wall.mesh);
                game.walls.splice(i, 1);

                // Add new wall ahead
                const furthestZ = Math.min(
                    ...game.rings.map(r => r.position.z),
                    ...game.walls.map(w => w.position.z)
                ) - 20;
                if (isFinite(furthestZ) && furthestZ < game.ball.position.z - 40) {
                    game.walls.push(new Wall(game.scene, furthestZ, game.colors));
                } else if (!isFinite(furthestZ)) {
                    // If there are no rings or walls, create one relative to the ball
                    game.walls.push(new Wall(game.scene, game.ball.position.z - 40, game.colors));
                }
            }
        }
    }
}