const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

const ratio = 1.85;
const width = 800;
const height = Math.round(width / ratio);

const padding = 15;
const radius = 16;

const canvas = createCanvas(width, height);
const context = canvas.getContext('2d');

context.fillStyle = "#313338";
context.fillRect(0, 0, canvas.width, canvas.height);
context.fillStyle = "white";
context.fillRect(0, 30 + padding, canvas.width, 15);

context.font = "bold 30px Arial";
context.fillStyle = "green";
context.fillText("Radiant Victory", 0 + padding, 30 + 2);

loadImage("https://github.com/yuan-miranda/UNKNOWN_HERO.png/raw/main/AXE.png").then((image) => {
    console.log(image.width + " " + image.height);
    // Hero images
    context.fillRect        (0,           45 + padding, padding, image.height * 5 / 4);
    context.drawImage(image, 0 + padding, 45 + image.height * 0 / 4 + padding, image.width / 4, image.height / 4);
    context.drawImage(image, 0 + padding, 45 + image.height * 1 / 4 + padding, image.width / 4, image.height / 4);
    context.drawImage(image, 0 + padding, 45 + image.height * 2 / 4 + padding, image.width / 4, image.height / 4);
    context.drawImage(image, 0 + padding, 45 + image.height * 3 / 4 + padding, image.width / 4, image.height / 4);
    context.drawImage(image, 0 + padding, 45 + image.height * 4 / 4 + padding, image.width / 4, image.height / 4);

    context.fillStyle = "red";
    context.fillRect        (0,           15 + canvas.height / 2 + padding, padding, image.height * 5 / 4);
    context.drawImage(image, 0 + padding, 15 + canvas.height / 2 + padding, image.width / 4, image.height / 4);
    context.drawImage(image, 0 + padding, 15 + canvas.height / 2 + image.height * 1 / 4 + padding, image.width / 4, image.height / 4);
    context.drawImage(image, 0 + padding, 15 + canvas.height / 2 + image.height * 2 / 4 + padding, image.width / 4, image.height / 4);
    context.drawImage(image, 0 + padding, 15 + canvas.height / 2 + image.height * 3 / 4 + padding, image.width / 4, image.height / 4);
    context.drawImage(image, 0 + padding, 15 + canvas.height / 2 + image.height * 4 / 4 + padding, image.width / 4, image.height / 4);

    const level = 20;
    for (let i = 0; i < 5; i++) {
        context.fillStyle = "black";
        // Level circle (outline or somesort)
        context.beginPath();
        context.arc(5 + image.width / 4 + padding + radius, 45 + image.height * i / 4 + padding + radius + 2, (image.height / 4) / 2 - 2, 0, 2 * Math.PI, false);
        context.fill();
        context.stroke();

        context.beginPath();
        context.arc(5 + image.width / 4 + padding + radius, 15 + canvas.height / 2 + image.height * i / 4 + padding + radius + 2, (image.height / 4) / 2 - 2, 0, 2 * Math.PI, false);
        context.fill();
        context.stroke();

        context.font = "bold 20px Arial";
        context.fillStyle = "white";
        // Player names
        context.fillText("RadiantTeam", 60 + image.width / 4, 45 + image.height * i / 4 + padding + 20 + 5);
        context.fillText("DireTeam", 60 + image.width / 4, 15 + canvas.height / 2 + image.height * i / 4 + padding + 20 + 5);

        context.fillStyle = "gold";
        // Adjust level position
        if (level > 9) {
            context.fillText(level, 5 + image.width / 4 + padding + radius / 3, 45 + image.height * i / 4 + padding + 20 + 5);
            context.fillText(level, 5 + image.width / 4 + padding + radius / 3, 15 + canvas.height / 2 + image.height * i / 4 + padding + 20 + 5);

        }
        else {
            context.fillText(level, 5 + image.width / 4 + padding + radius / 1.5, 45 + image.height * i / 4 + padding + 20 + 5);
            context.fillText(level, 5 + image.width / 4 + padding + radius / 1.5, 15 + canvas.height / 2 + image.height * i / 4 + padding + 20 + 5);

        }

        context.font = "bold 15px Arial";
        context.fillStyle = "black";
        // Headers
        context.fillText("K", 210 + image.width / 4 + padding / 2, 20 + image.height * 0 / 4 + padding + 20 + 3);
        context.fillText("D", 255 + image.width / 4 + padding / 2, 20 + image.height * 0 / 4 + padding + 20 + 3);
        context.fillText("A", 300 + image.width / 4 + padding / 2, 20 + image.height * 0 / 4 + padding + 20 + 3);
        context.fillText("GPM", 360 + image.width / 4 + padding / 2 - 3, 20 + image.height * 0 / 4 + padding + 20 + 3);
        context.fillText("LH", 445 + image.width / 4 + padding / 2, 20 + image.height * 0 / 4 + padding + 20 + 3);
        context.fillText("DN", 505 + image.width / 4 + padding / 2 - 3, 20 + image.height * 0 / 4 + padding + 20 + 3);
        
        context.font = "bold 20px Arial";
        context.fillStyle = "white";
        // KDA (Kill, Death, Assist)
        context.fillText("10", 210 + image.width / 4, 45 + image.height * i / 4 + padding + 20 + 3);
        context.fillText("0", 255 + image.width / 4, 45 + image.height * i / 4 + padding + 20 + 3);
        context.fillText("10", 300 + image.width / 4, 45 + image.height * i / 4 + padding + 20 + 3);

        context.fillText("10", 210 + image.width / 4, 15 + canvas.height / 2 + image.height * i / 4 + padding + 20 + 3);
        context.fillText("0", 255 + image.width / 4, 15 + canvas.height / 2 + image.height * i / 4 + padding + 20 + 3);
        context.fillText("10", 300 + image.width / 4, 15 + canvas.height / 2 + image.height * i / 4 + padding + 20 + 3);

        // GPM (Gold Per Minute)
        context.fillStyle = "gold";
        context.fillText("1345", 360 + image.width / 4, 45 + image.height * i / 4 + padding + 20 + 3);
        context.fillText("1283", 360 + image.width / 4, 15 + canvas.height / 2 + image.height * i / 4 + padding + 20 + 3);

        // LH (Last Hits)
        context.fillStyle = "white";
        context.fillText("125", 445 + image.width / 4, 45 + image.height * i / 4 + padding + 20 + 3);
        context.fillText("90", 445 + image.width / 4, 15 + canvas.height / 2 + image.height * i / 4 + padding + 20 + 3);

        // DN (Denies)
        context.fillText("32", 505 + image.width / 4, 45 + image.height * i / 4 + padding + 20 + 3);
        context.fillText("103", 505 + image.width / 4, 15 + canvas.height / 2 + image.height * i / 4 + padding + 20 + 3);
    }
    

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('./output.png', buffer);
});