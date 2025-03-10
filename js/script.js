window.onload = function init() {

  // console.log("page loaded and DOM is ready");

  const rootStyles = getComputedStyle(document.documentElement);
  
  // Get CSS variables
  const colors = {
    blue: rootStyles.getPropertyValue("--blue").trim(),
    green: rootStyles.getPropertyValue("--green").trim(),
    purple: rootStyles.getPropertyValue("--purple").trim(),
    red: rootStyles.getPropertyValue("--red").trim(),
    orange: rootStyles.getPropertyValue("--orange").trim(),
  };

  // Set values dynamically for all matching 'options' element
  Object.keys(colors).forEach((color) => {
    document.querySelectorAll(`option.${color}`).forEach((option) => {
      option.value = colors[color];
    });
  });
  
  const gameOverSound = document.querySelector('#gameOverSound');
  const obstacleSound = document.querySelector('#obstacleSound');
  obstacleSound.volume = 0.5;
  const powerUpSound = document.querySelector('#powerUpSound');
  const playerSound = document.querySelector('#playerSound');
  const missSound = document.querySelector('#missSound');
  const backgroundMusic = document.querySelector('#backgroundMusic');
  backgroundMusic.volume = 0.3;
  const muteButton = document.querySelector('#muteButton');

  muteButton.addEventListener('click', function(){
    gameOverSound.muted = !gameOverSound.muted; //change the mute states of all audio elements between true and false
    obstacleSound.muted = !obstacleSound.muted;
    powerUpSound.muted = !powerUpSound.muted;
    playerSound.muted = !playerSound.muted;
    missSound.muted = !missSound.muted;
    backgroundMusic.muted = !backgroundMusic.muted;
    muteButton.textContent = missSound.muted ? 'UNMUTE' : 'MUTE'; //Update the button text based on the mute state of one of the audio elements
  });

  const player1ColorSelector=document.querySelector('#player1ColorSelector');
  player1ColorSelector.addEventListener('change',function(){
    const value = player1ColorSelector.value;
    player1.color=value;
    document.querySelectorAll('.p1Color').forEach(element =>{
      element.style.color=value;
    });
    document.querySelector('#health-bar-player1').style.background=`linear-gradient(90deg, ${value} 0%, #CCCCCC 50%, ${value} 100%)`;
    document.querySelector('#health-bar-player1').style.backgroundSize ="5%";
    drawPlayer(player1); //draw the player with new color
  });

  const player2ColorSelector=document.querySelector('#player2ColorSelector');
  player2ColorSelector.addEventListener('change',function(){
    const value = player2ColorSelector.value;
    player2.color=value;
    document.querySelectorAll('.p2Color').forEach(element => {
      element.style.color=value;
    });
    document.querySelector('#health-bar-player2').style.background=`linear-gradient(90deg, ${value} 0%, #CCCCCC 50%, ${value} 100%)`;
    document.querySelector('#health-bar-player2').style.backgroundSize ="5%";
    drawPlayer(player2);
  });

  const winStatus1=document.querySelector('#winStatus1');
  const winStatus2=document.querySelector('#winStatus2');
  const restartButtonDiv = document.querySelector('#restartButtonDiv');
  let restartButton; // = document.querySelector('#restartButton') but I cannot assign now since the element will be created dynamically.
  
  const dropdownButton = document.querySelector("#dropdownButton");
  const dropdownContent = document.querySelector("#dropdownContent");
  const blur = document.querySelector("#blur");
 
  dropdownButton.addEventListener("click", function () {
    dropdownContent.classList.toggle("show");
    blur.classList.toggle("show");
  });
  document.addEventListener('click', function(evt){ //to close menu if you click outside of menu and button
    if (!dropdownContent.contains(evt.target) && !dropdownButton.contains(evt.target)&&dropdownContent.classList.contains("show")){
      //if I don't exclude button, when button is clicked for opening it will open and close menu due to event propagation
      dropdownContent.classList.remove("show");
      blur.classList.remove("show");
    }
  });

  const canvas = document.querySelector("#gameCanvas");
  const w = canvas.width; 
  const h = canvas.height;
  const ctx = canvas.getContext("2d");
  let animationId,PowerUpTimerId;//flag variables to store return values of requestAnimationFrame() and setTimeout() for future manipulation
  let distanceX, distanceY;
  let isArrowUpPressed = false;
  let isArrowDownPressed = false;
  let isWPressed = false;
  let isSPressed = false;
  let didPlayer1Hit=true;
  let didPlayer2Hit=true;
  const fullHealth=10;
  let player1Health=fullHealth;
  let player2Health=fullHealth;
  updateHealth();
  updateHealthBars();
  let isP1LastHitter=false;
  let isP2LastHitter=false;
  let hitCount=0;
  let startTime1, startTime2, timeRemaining1,timeRemaining2; //for keeping track of players' elapsed powerUp time between pause/play
  const timeGiven=10000;

  let ball={
    x:45,
    y:250,
    speedX:5,
    speedY:0,
    radius:10,
    color:"white"
  };

  let player1={
    x:0,
    y:0,
    speed: 5,
    height:100,
    width: 35,
    color: getComputedStyle(document.documentElement).getPropertyValue('--green').trim()
  };
  player1.y=(h-player1.height)/2;

  let player2={ 
    x:0,
    y:0,
    speed: 5,
    height:100,
    width: 35,
    color: getComputedStyle(document.documentElement).getPropertyValue('--orange').trim()
  };
  player2.x=w-player2.width;
  player2.y=(h-player2.height)/2;

  let obstacle={
    x:(w-30)/2,
    y:-30,
    speed:5,
    angle:0,
    angularSpeed:0.001*Math.PI,
    size:30,
  };

  let powerUp={
    x:w/2,
    y:-940,//carefully chosen spot such that the powerUp will pass twice untouched by the ball of speed (5,0) if obstacles haven't randomised the game yet
    speed:3,
    radius:45,
  };

  let p1Space={ //range of free space between player1 and obstacle, used for the hitMissChecker function 
    x1:45,
    x2:60
  }

  let p2Space={ //range of free space between player2 and obstacle, used for the hitMissChecker function
    x1:440,
    x2:455
  }

  //Draw canvas background image, players and ball on initial render. 
  const canvasBackgroundImage = new Image();
  canvasBackgroundImage.src = 'assets/canvasBackgroundImage.jpg';
  function drawBall(){
    ctx.save();
    ctx.translate(ball.x,ball.y);
    ctx.fillStyle=ball.color;
    ctx.beginPath();
    ctx.arc(0, 0,ball.radius, 0, 2*Math.PI);
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer(p){
    ctx.save();
    ctx.translate(p.x,p.y);
    ctx.fillStyle=p.color;
    ctx.fillRect(0, 0, p.width, p.height);
    ctx.restore();
  }
  canvasBackgroundImage.onload = function () {
    ctx.drawImage(canvasBackgroundImage, 0, 0, w, h);
    //draw current ball, players
    
    drawBall(); 
    drawPlayer(player1); 
    drawPlayer(player2);
  };
  

  document.addEventListener('keydown', keydownHandler);


  function keydownHandler(event) {
    if (event.key === 'ArrowUp') {
      event.preventDefault(); //prevent default scrolling
      isArrowUpPressed = true;
    } else if (event.key === 'ArrowDown') {
      event.preventDefault(); //prevent default scrolling
      isArrowDownPressed = true;
    } else if (event.key === 'w') {
      isWPressed = true;
    } else if (event.key === 's') {
      isSPressed = true;
    }
  }


  document.addEventListener('keyup', keyupHandler);
  

  function keyupHandler(event) {
    if (event.key === 'ArrowUp') {
      isArrowUpPressed = false;
    } else if (event.key === 'ArrowDown') {
      isArrowDownPressed = false;
    } else if (event.key === 'w') {
      isWPressed = false;
    } else if (event.key === 's') {
      isSPressed = false;
    }
  }


  document.querySelector('#playPauseButton').addEventListener('click',startStopBallLoop);


  function startStopBallLoop() {
    if (!restartButton) {
      restartButtonDiv.innerHTML= '<button id="restartButton">RESTART</button>' //This makes restart button appear when game is started
      restartButtonDiv.classList.add("padded");
      restartButton = document.querySelector('#restartButton'); //I can assign the element now that it exists
      restartButton.addEventListener('click', restart);
    }
    if (!animationId) { //if the animation frame is not already running, let it run
      ballLoop();
      playBackgroundMusic();
      playPauseButton.textContent ='PAUSE';
      resumeSetTimeout();
    } else { //if the animation frame is running, stop it 
      cancelAnimationFrame(animationId);
      animationId = undefined; // Reset the flag variable to indicate that the loop is stopped
      backgroundMusic.pause();
      playPauseButton.textContent ='PLAY';
      pauseSetTimeout();
    }
  }


  function restart(){
    if (animationId) { //if the animation frame is running, stop it.
      cancelAnimationFrame(animationId);
      animationId = undefined;
    }
    resetAllVariables();
    startStopBallLoop();
  }


  function playBackgroundMusic(){
    if((player1Health!==0)&&(player2Health!==0)){
      backgroundMusic.play();
    }
  }


  function pauseSetTimeout(){
    if((isP1LastHitter)||(isP2LastHitter))clearTimeout(PowerUpTimerId); //don't bother if no one has hit the ball
    timeRemaining1-=Date.now()-startTime1;
    timeRemaining2-=Date.now()-startTime2;
  }


  function resumeSetTimeout(){
    if((player1Health!==0)&&(player2Health!==0)){
      if(timeRemaining1>0){
        PowerUpTimerId=setTimeout(()=>{
          player1.height/=2; //restore paddle size
          player1.y+=player1.height/2; //centralize paddle
          powerUp.speed=3; //and let powerUp start falling again
        },timeRemaining1);
        startTime1=Date.now();
      }else if(timeRemaining2>0){
        PowerUpTimerId=setTimeout(()=>{ 
          player2.height/=2; //restore paddle size
          player2.y+=player2.height/2; //centralize paddle
          powerUp.speed=3; //and let powerUp start falling again
        },timeRemaining2);
        startTime2=Date.now();
      }
    }
  }


  function resetAllVariables(){
    backgroundMusic.pause();
    backgroundMusic.currentTime=0;
    gameOverSound.pause();
    didPlayer1Hit=true;
    didPlayer2Hit=true;
    isP1LastHitter=false;
    isP2LastHitter=false;
    hitCount=0;
    player1Health=fullHealth;
    player2Health=fullHealth;
    updateHealthBars();
    updateHealth();
    winStatus1.innerHTML='';
    winStatus2.innerHTML='';
    clearTimeout(PowerUpTimerId); //abort any powerUp setTimeout waiting to half the height of a player
    abortGameOverAnimation();
    startTime1=0;
    startTime2=0;
    timeRemaining1=0;
    timeRemaining2=0;
    ball.x=45;
    ball.y=250;
    ball.speedX=5;
    ball.speedY=0;
    player1.height=100; //in case the player is on powerUp
    player1.y=(h-player1.height)/2; //then centralize
    player2.height=100;
    player2.y=(h-player2.height)/2;
    obstacle.x=(w-30)/2;
    obstacle.y=-30;
    obstacle.speed=5;
    obstacle.angle=0;
    obstacle.angularSpeed=0.001*Math.PI;
    obstacle.size=30;
    powerUp.x=w/2;
    powerUp.y=-940;
    powerUp.speed=3;
    powerUp.radius=45;
  }


  function ballLoop(){
    if((player1Health===0)||(player2Health===0)){//loop gets cancelled when called if someone is dead
      cancelAnimationFrame(animationId);
      animationId = undefined; // Reset the variable to indicate that the loop is stopped
    }else{
      // clear the canvas i.e remove previous ball and players
      ctx.clearRect(0, 0, w, h);
      
      ctx.drawImage(canvasBackgroundImage, 0, 0, w, h);

      //draw current ball, players, obstacle
      drawBall(); 
      drawPlayer(player1); 
      drawPlayer(player2);
      drawPowerUp();
      drawObstacle();
    
      //determine next position of ball, players, obstacle
      determineBallNextPosition(); 
      determinePlayerNextPosition(player1); 
      determinePlayerNextPosition(player2);
      determineObstacleNextPosition();
      determinePowerUpNextPosition();
      
      //handlers for canvas boundaries
      handleBallBoundaries(); 
      handlePlayerBoundaries(player1); 
      handlePlayerBoundaries(player2);
      handleObstacleBoundaries();
      handlePowerUpBoundaries();

      //check if a player hit or missed the ball (to update health and know who claims powerUp)
      hitMissChecker();

      //handle collision between ball and players
      handleBallPlayerCollision(ball,player1);
      handleBallPlayerCollision(ball,player2);

      //handle collision between ball and Obstacle
      handleBallObstacleCollision();

      //handle collision between ball and powerUp
      handleBallPowerUpCollision();

      //request a new frame of animation in 1/60s
      animationId=requestAnimationFrame(ballLoop);
    }
  }

  const skullPath = new Path2D("M368 128c0 44.4-25.4 83.5-64 106.4l0 21.6c0 17.7-14.3 32-32 32l-96 0c-17.7 0-32-14.3-32-32l0-21.6c-38.6-23-64-62.1-64-106.4C80 57.3 144.5 0 224 0s144 57.3 144 128zM168 176a32 32 0 1 0 0-64 32 32 0 1 0 0 64zm144-32a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zM3.4 273.7c7.9-15.8 27.1-22.2 42.9-14.3L224 348.2l177.7-88.8c15.8-7.9 35-1.5 42.9 14.3s1.5 35-14.3 42.9L295.6 384l134.8 67.4c15.8 7.9 22.2 27.1 14.3 42.9s-27.1 22.2-42.9 14.3L224 419.8 46.3 508.6c-15.8 7.9-35 1.5-42.9-14.3s-1.5-35 14.3-42.9L152.4 384 17.7 316.6C1.9 308.7-4.5 289.5 3.4 273.7z");

  function drawSkull(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x-size/2, y-size/2);
    ctx.scale(size / 448, size / 512); // Scale the SVG proportionally
    ctx.fillStyle = "white"; // Set the skull color
    ctx.fill(skullPath);
    ctx.restore();
  }

  function drawObstacle() {
    ctx.save();
    ctx.translate(obstacle.x + obstacle.size / 2, obstacle.y + obstacle.size / 2);
    
    // Glowing red square
    ctx.rotate(obstacle.angle);
    ctx.shadowBlur = 30;
    ctx.shadowColor = "red";
    ctx.strokeStyle = "red";
    ctx.lineWidth = 4;
    ctx.strokeRect(-obstacle.size / 2, -obstacle.size / 2, obstacle.size, obstacle.size);
    
    // Rotating inner diamond
    ctx.rotate(-2*obstacle.angle);
    ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
    ctx.beginPath();
    ctx.moveTo(0, -obstacle.size / 3);
    ctx.lineTo(obstacle.size / 3, 0);
    ctx.lineTo(0, obstacle.size / 3);
    ctx.lineTo(-obstacle.size / 3, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    ctx.save();
    ctx.translate(obstacle.x + obstacle.size / 2, obstacle.y + obstacle.size / 2);

    // Inner circle for depth
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(0, 0, obstacle.size / 4, 0, 2 * Math.PI);
    ctx.fill();

    // Skull icon in the center
    drawSkull(ctx, 0, 0, obstacle.size / 3);

    ctx.restore();
  }

  function drawPowerUp(){
    ctx.save();
    ctx.translate(powerUp.x,powerUp.y);

    ctx.shadowColor = "rgba(173, 216, 230, 0.9)"; // Light Cyan Glow
    ctx.shadowBlur = 25;

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, powerUp.radius);
    gradient.addColorStop(0, '#FF4500'); // Neon Orange
    gradient.addColorStop(1, '#00E5FF'); // Electric Blue

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, powerUp.radius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.shadowColor = "rgba(0, 0, 0, 0)"; // Reset shadow

    // Plus sign (two perpendicular rectangles)
    ctx.fillStyle = "#FFD700"; // Bright Gold
    let plusSize = powerUp.radius * 0.2;
    ctx.fillRect(-plusSize / 2, -plusSize * 1.5, plusSize, plusSize * 3);
    ctx.fillRect(-plusSize * 1.5, -plusSize / 2, plusSize * 3, plusSize);

    ctx.restore();
  }


  function determineBallNextPosition(){
    ball.x +=ball.speedX;
    ball.y += ball.speedY;
  }


  function determinePlayerNextPosition(p){
    if (p===player1){
      if (isWPressed) {
        //console.log('W is pressed');
        p.y -= p.speed;
      }
      if (isSPressed) {
        //console.log('S is pressed');
        p.y += p.speed;
      }
    } else if (p===player2){
      if (isArrowUpPressed) {
        //console.log('Arrow Up is pressed');
        p.y -= p.speed;
      }
      if (isArrowDownPressed) {
        //console.log('Arrow Down is pressed');
        p.y += p.speed;
      }
    }
  }


  function determineObstacleNextPosition(){
    obstacle.y+=obstacle.speed;
    obstacle.angle+=obstacle.angularSpeed;
  }


  function determinePowerUpNextPosition(){
    powerUp.y +=powerUp.speed;
  }


  function handleBallBoundaries(){
    //for vertical boundaries:
    if((ball.x + ball.radius)> w){
      //it hit right canvas side so return ball to surface and direct ball left
      ball.x =w-ball.radius;
      ball.speedX=-Math.abs(ball.speedX);
    } else if((ball.x-ball.radius)<0){
      //it hit left canvas side so return ball to surface and direct ball right
      ball.x =ball.radius;
      ball.speedX=Math.abs(ball.speedX);
    }

    //for horizontal boundaries:
    if((ball.y + ball.radius)> h){
      //it hit bottom canvas side so return ball to surface and direct ball up
      ball.y =h-ball.radius;
      ball.speedY=-Math.abs(ball.speedY);
    } else if((ball.y-ball.radius)<0){
      //it hit top canvas side so return ball to surface and direct ball down
      ball.y =ball.radius;
      ball.speedY=Math.abs(ball.speedY);
    }
  }


  function handlePlayerBoundaries(p){
    if((p.y + p.height)> h){
      //return player to collision point
      p.y =h-p.height;
    } else if(p.y<0){
      //return player to collision point
      p.y =0;
    }
  }


  function handleObstacleBoundaries(){
    if(obstacle.y>h+1.21*obstacle.size){ // the obstacle just went out of sight
      obstacle.size=30+120*Math.random(); //randomize the size from 30 to 150
      obstacle.speed=1+4*Math.random(); //randomize the speed from 1 to 5
      obstacle.angle=0; //reset the angle to zero to prevent excessive rotation buildup
      obstacle.angularSpeed=Math.PI*(0.001+0.009*Math.random()); //randomize the angular speed from 0.001Pi to 0.01Pi
      obstacle.x=(w-obstacle.size)/2; //centralize the obstacle
      obstacle.y=-obstacle.size; //send it in from the top
    }
  }


  function handlePowerUpBoundaries(){
    if(powerUp.y>h+powerUp.radius){ // the powerUp just went out of sight
      powerUp.y=-powerUp.radius; //send it in from the top
    }
  }


  function hitMissChecker(){
    if((ball.x>p1Space.x1)&&(ball.x<p1Space.x2)&&(ball.speedX===-Math.abs(ball.speedX))){//ball close to and heading towards player1
      didPlayer1Hit=false;
    }else if ((ball.x>p2Space.x1)&&(ball.x<p2Space.x2)&&(ball.speedX===Math.abs(ball.speedX))){//ball close to and heading towards player2
      didPlayer2Hit=false;
    }
    if(overlap(ball,player1)){ // a hit!
      didPlayer1Hit=true;
      isP1LastHitter=true;
      isP2LastHitter=false;
      accelerateBall();
      playPlayerSound();
    } else if (overlap(ball,player2)){ // a hit!
      didPlayer2Hit=true;
      isP1LastHitter=false;
      isP2LastHitter=true;
      accelerateBall();
      playPlayerSound();
    }
    if((ball.x>p1Space.x2)&&(ball.speedX===Math.abs(ball.speedX))&&(didPlayer1Hit===false)){//ball going away from player1 without contact (a miss!)
      player1Health-=1;
      updateHealth();
      updateHealthBars();
      didPlayer1Hit=true;//reset to avoid detecting the miss continously
      deccelerateBall();
      playMissSound();
    } else if ((ball.x<p2Space.x1)&&(ball.speedX===-Math.abs(ball.speedX))&&(didPlayer2Hit===false)){//ball going away from player2 without contact (a miss!)
      player2Health-=1;
      updateHealth();
      updateHealthBars();
      didPlayer2Hit=true;//reset to avoid detecting the miss continously
      deccelerateBall();
      playMissSound();
    }
  }


  function overlap(b,p){
    // Find the x and y coordinates of closest point to the circle within the rectangle
    let closestX = Math.max(p.x, Math.min(b.x, p.x + p.width));
    let closestY = Math.max(p.y, Math.min(b.y, p.y + p.height));

    // Calculate the distance between the circle's center and this closest point
    distanceX = b.x - closestX;
    distanceY = b.y - closestY;
    let distanceSquared = distanceX * distanceX + distanceY * distanceY;

    // If the distance is less than the circle's radius, there is a collision(overlap)
    return(distanceSquared < (b.radius * b.radius));
  }


  function accelerateBall(){
    hitCount+=1;
    if((hitCount%10===0)&&(hitCount<=50)){ //at every 10 hits we accelerate, and stop after 5 times of accelerating
      ball.speedX*=1.1;//This line and the next jointly multiply the resultant speed by 1.1
      ball.speedY*=1.1;
    }
  }


  function updateHealthBars(){
    const healthBar1 = document.getElementById("health-bar-player1");
    const newWidth1 = (player1Health /fullHealth) * 100 + "%";
    healthBar1.style.width = newWidth1;
    const healthBar2 = document.getElementById("health-bar-player2");
    const newWidth2 = (player2Health /fullHealth) * 100 + "%";
    healthBar2.style.width = newWidth2;
  }


  function deccelerateBall(){
    ball.speedX*=5/Math.sqrt(ball.speedX**2+ball.speedY**2);//This line and the next jointly restore the resultant speed to 5
    ball.speedY*=5/Math.sqrt(ball.speedX**2+ball.speedY**2);
    hitCount=0; //resets the acceleration count
  }


  function playPlayerSound(){
    playerSound.currentTime = 75/1000;
    playerSound.play();
  }


  function playMissSound(){
    if((player1Health!==0)&&(player2Health!==0)){
      missSound.currentTime = 0;
      missSound.play();
    }
  }


  function updateHealth(){
    document.querySelector('#player1Health').innerHTML=player1Health;
    document.querySelector('#player2Health').innerHTML=player2Health;
    if(player2Health===0){
      winStatus1.innerHTML='<br><br>YOU WIN';
      winStatus2.innerHTML='<br><br>YOU LOSE';
      backgroundMusic.pause();
      playGameOverSound();
      gameOverAnimation();
      clearTimeout(PowerUpTimerId); //abort any powerUp setTimeout waiting to half the height of a player
    } else if(player1Health===0){
      winStatus1.innerHTML='<br><br>YOU LOSE';
      winStatus2.innerHTML='<br><br>YOU WIN';
      backgroundMusic.pause();
      playGameOverSound();
      gameOverAnimation();
      clearTimeout(PowerUpTimerId); //abort any powerUp setTimeout waiting to half the height of a player
    }
  }


  function playGameOverSound(){
    gameOverSound.currentTime = 0;
    gameOverSound.play();
  }


  let timeouts = []; // Store timeout IDs
  function gameOverAnimation() {
      // Step 1: Draw the translucent overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
      ctx.fillRect(0, 0, w, h);

      // Step 2: Create gradient for the text
      const gradient = ctx.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, colors.blue);
      gradient.addColorStop(0.12, colors.blue);
      gradient.addColorStop(0.22, colors.green);
      gradient.addColorStop(0.34, colors.green);
      gradient.addColorStop(0.44, colors.orange);
      gradient.addColorStop(0.56, colors.orange);
      gradient.addColorStop(0.66, colors.purple);
      gradient.addColorStop(0.78, colors.purple);
      gradient.addColorStop(0.88, colors.red);
      gradient.addColorStop(1, colors.red);

      // Step 3: Display "GAME OVER" with delays
      ctx.font = 'bold 100px Orbitron';
      ctx.fillStyle = gradient;

      const letters = ["G", "A", "M", "E", "O", "V", "E", "R", "!"];
      const positions = [
          [68, 227], [168, 227], [268, 227], [368, 227],
          [37, 325], [137, 325], [237, 325], [337, 325], [437, 325]
      ];

      letters.forEach((letter, index) => {
          const timeoutId = setTimeout(() => {
              ctx.fillText(letter, positions[index][0], positions[index][1]);
          }, index * 1850);
          timeouts.push(timeoutId);
      });
  }


  function abortGameOverAnimation() {
      timeouts.forEach(clearTimeout);
      timeouts = []; // Clear stored timeouts
  }

 
  function handleBallPlayerCollision(b,p){
    if(overlap(b,p)){

      //we then decide how to deflect/direct the ball depending on which side of the rectangle it hit
      //or which side it hit more on, in case it hit the vertex
      if(Math.abs(distanceX)<Math.abs(distanceY)){
        //it hit the vertex more on a horizontal side of the rectangle(or entirely on a horizontal side if distanceX is zero)
        if(distanceY>0){
          //it hit bottom side so return ball to surface and direct ball down
          b.y=p.y+p.height+b.radius;
          b.speedY=Math.abs(b.speedY);
        } else {
          //it hit top side so return ball to surface and direct ball up 
          b.y=p.y-b.radius;
          b.speedY=-Math.abs(b.speedY); 
        }
      } else if(Math.abs(distanceX)>Math.abs(distanceY)){
        //it hit the vertex more on a vertical side of the rectangle(or entirely on a vertical side if distanceY is zero)
        if(distanceX>0){
          //it hit right side so return ball to surface and direct ball right
          b.x=p.x+p.width+b.radius; 
          b.speedX=Math.abs(b.speedX);  
        } else{
          //it hit left side so return ball to surface and direct ball left
          b.x=p.x-b.radius;
          b.speedX=-Math.abs(b.speedX); 
        }
      } else {//i.e Math.abs(distanceX)=Math.abs(distanceY) 
        if(distanceX===0){ 
          //as in |0|=|0| meaning the ball center has been forced by 'relative speed' or 'canvas boundaries' into the inside of player
          //Can only happen from top/bottom of ball cuz ball is never fast enough to enter player except combining an opposing vertical speed of player
          //or when the ball is crushed between player and canvas
          if(b.y<p.y+0.5*p.height){
            //it happened at top of player so return ball to surface of player and direct ball up 
            b.y=p.y-b.radius;
            b.speedY=-Math.abs(b.speedY);
          }else {
            //it happened at bottom of player so return ball to surface of player and direct ball down
            b.y=p.y+p.height+b.radius;
            b.speedY=Math.abs(b.speedY);
          }
        } else{
          //as in e.g |-3|=|+3| meaning it hit the vertex so evenly that the circle center and the rectangle's vertex form opposite vertices of a square
          if(distanceY>0&&distanceX>0){
            //it hit bottomRight corner so move ball bottomRightWards
            b.speedY=Math.abs(b.speedY); 
            b.speedX=Math.abs(b.speedX); 
          } else if(distanceY>0&&distanceX<0){
            // ...bottomLeftWards
            b.speedY=Math.abs(b.speedY); 
            b.speedX=-Math.abs(b.speedX); 
          } else if(distanceY<0&&distanceX>0){
            // ...topRightWards
            b.speedY=-Math.abs(b.speedY); 
            b.speedX=Math.abs(b.speedX); 
          } else {
             // ...topLeftWards
            b.speedY=-Math.abs(b.speedY); 
            b.speedX=-Math.abs(b.speedX);
          }
        }
      }
    }
  }

  
  function handleBallObstacleCollision(){
    let rotatedBall={}; //we create this anti-ball to coincide(or not) with obstacle unrotated rectangle
    //because if this anti-rotated ball coincides with obstacle unrotated rectangle, then actual ball coincides with actual (rotated) obstacle 
    rotatedBall.x=rotateAnticlockwiseAroundCenter(ball.x, ball.y,obstacle.x+obstacle.size/2,obstacle.y+obstacle.size/2, obstacle.angle).x;
    rotatedBall.y=rotateAnticlockwiseAroundCenter(ball.x, ball.y,obstacle.x+obstacle.size/2,obstacle.y+obstacle.size/2, obstacle.angle).y;
    rotatedBall.speedX=rotateAnticlockwiseAroundCenter(ball.speedX, ball.speedY,0,0, obstacle.angle).x;//speeds are not points but vectors so rotate about
    rotatedBall.speedY=rotateAnticlockwiseAroundCenter(ball.speedX, ball.speedY,0,0, obstacle.angle).y; //origin to preserve magnitude change direction
    rotatedBall.radius=ball.radius;
    obstacle.height=obstacle.size;// we explicitely give the square obstacle, height and width properties so we can handle collision like it was a player
    obstacle.width=obstacle.size;
    if (overlap(rotatedBall,obstacle)){
      playObstacleSound();
    }
    handleBallPlayerCollision(rotatedBall,obstacle); //after this function has made necessary alterations to anti-ball, we convert to our real ball
    ball.x=rotateClockwiseAroundCenter(rotatedBall.x, rotatedBall.y,obstacle.x+obstacle.size/2,obstacle.y+obstacle.size/2, obstacle.angle).x;
    ball.y=rotateClockwiseAroundCenter(rotatedBall.x, rotatedBall.y,obstacle.x+obstacle.size/2,obstacle.y+obstacle.size/2, obstacle.angle).y;
    ball.speedX=rotateClockwiseAroundCenter(rotatedBall.speedX, rotatedBall.speedY,0,0, obstacle.angle).x;
    ball.speedY=rotateClockwiseAroundCenter(rotatedBall.speedX, rotatedBall.speedY,0,0, obstacle.angle).y;
  }


  function playObstacleSound(){
    obstacleSound.currentTime = 0;
    obstacleSound.play();
  }


  function rotateClockwiseAroundCenter(x, y, cx, cy, angleInRadians){ //This is Anticlockwise for cartesian cuz HTML canvas y-axis is flipped
    // Translate to the origin
    let translatedX = x - cx;
    let translatedY = y - cy;
    // Rotate around the origin
    let rotatedX = translatedX * Math.cos(angleInRadians) - translatedY * Math.sin(angleInRadians);
    let rotatedY = translatedX * Math.sin(angleInRadians) + translatedY * Math.cos(angleInRadians);
    // Translate back to the original position
    let finalX = rotatedX + cx;
    let finalY = rotatedY + cy;
    return { x: finalX, y: finalY };
  }


  function rotateAnticlockwiseAroundCenter(x, y, cx, cy, angleInRadians){ //This is Clockwise for cartesian cuz HTML canvas y-axis is flipped
    // Translate to the origin
    let translatedX = x - cx;
    let translatedY = y - cy;
    // Rotate around the origin
    let rotatedX = translatedX * Math.cos(angleInRadians) + translatedY * Math.sin(angleInRadians);
    let rotatedY = -translatedX * Math.sin(angleInRadians) + translatedY * Math.cos(angleInRadians);
    // Translate back to the original position
    let finalX = rotatedX + cx;
    let finalY = rotatedY + cy;
    return { x: finalX, y: finalY };
  }
  

  function handleBallPowerUpCollision(){
    if((ball.x-powerUp.x)**2+(ball.y-powerUp.y)**2<(ball.radius+powerUp.radius)**2){ //there is ball powerUp collision
      playPowerUpSound();
      powerUp.y=-powerUp.radius*2; //take powerUp out just above the canvas
      powerUp.speed=0; //and make it stationary
      if(isP1LastHitter){
        player1.height*=2; //double paddle size
        player1.y-=player1.height/4; //centralize paddle
        PowerUpTimerId=setTimeout(()=>{ //wait 10 seconds (PowerUpTimerId can be used to abort the function before it executes using clearTimeout)
          player1.height/=2; //restore paddle size
          player1.y+=player1.height/2; //centralize paddle
          powerUp.speed=3; //and let powerUp start falling again
        },timeGiven);
        startTime1=Date.now();
        timeRemaining1=timeGiven;
      }else if(isP2LastHitter){
        player2.height*=2; //double paddle size
        player2.y-=player2.height/4; //centralize paddle
        PowerUpTimerId=setTimeout(()=>{ //wait 10 seconds
          player2.height/=2; //restore paddle size
          player2.y+=player2.height/2; //centralize paddle
          powerUp.speed=3; //and let powerUp start falling again
        },timeGiven);
        startTime2=Date.now();
        timeRemaining2=timeGiven;
      }else{ //neither of the players has hit the ball
        PowerUpTimerId=setTimeout(()=>{
          powerUp.speed=3; //let powerUp start falling again after 10 seconds
        },timeGiven);
      }

    }
  }


  function playPowerUpSound(){
    powerUpSound.currentTime = 0;
    powerUpSound.play();
  }


};