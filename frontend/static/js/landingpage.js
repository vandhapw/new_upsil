// Animated Network Background
    (function() {
        var width, height, largeHeader, canvas, ctx, points, target, animateHeader = true;

        // Main
        initHeader();
        initAnimation();
        addListeners();

        function initHeader() {
            width = window.innerWidth;
            height = window.innerHeight;
            target = {x: width/2, y: height/2};

            largeHeader = document.getElementById('large-header');
            largeHeader.style.height = height+'px';

            canvas = document.getElementById('demo-canvas');
            canvas.width = width;
            canvas.height = height;
            ctx = canvas.getContext('2d');

            // create points
            points = [];
            for(var x = 0; x < width; x = x + width/20) {
                for(var y = 0; y < height; y = y + height/20) {
                    var px = x + Math.random()*width/20;
                    var py = y + Math.random()*height/20;
                    var p = {x: px, originX: px, y: py, originY: py };
                    points.push(p);
                }
            }

            // for each point find the 5 closest points
            for(var i = 0; i < points.length; i++) {
                var closest = [];
                var p1 = points[i];
                for(var j = 0; j < points.length; j++) {
                    var p2 = points[j]
                    if(!(p1 == p2)) {
                        var placed = false;
                        for(var k = 0; k < 5; k++) {
                            if(!placed) {
                                if(closest[k] == undefined) {
                                    closest[k] = p2;
                                    placed = true;
                                }
                            }
                        }

                        for(var k = 0; k < 5; k++) {
                            if(!placed) {
                                if(getDistance(p1, p2) < getDistance(p1, closest[k])) {
                                    closest[k] = p2;
                                    placed = true;
                                }
                            }
                        }
                    }
                }
                p1.closest = closest;
            }

            // assign a circle to each point
            for(var i in points) {
                var c = new Circle(points[i], 2+Math.random()*2, 'rgba(255,255,255,0.3)');
                points[i].circle = c;
            }
        }

        // Event handling
        function addListeners() {
            if(!('ontouchstart' in window)) {
                window.addEventListener('mousemove', mouseMove);
            }
            window.addEventListener('scroll', scrollCheck);
            window.addEventListener('resize', resize);
        }

        function mouseMove(e) {
            var posx = posy = 0;
            if (e.pageX || e.pageY) {
                posx = e.pageX;
                posy = e.pageY;
            }
            else if (e.clientX || e.clientY)    {
                posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
                posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
            }
            target.x = posx;
            target.y = posy;
        }

        function scrollCheck() {
            if(document.body.scrollTop > height) animateHeader = false;
            else animateHeader = true;
        }

        function resize() {
            width = window.innerWidth;
            height = window.innerHeight;
            largeHeader.style.height = height+'px';
            canvas.width = width;
            canvas.height = height;
        }

        // animation
        function initAnimation() {
            animate();
            for(var i in points) {
                shiftPoint(points[i]);
            }
        }

        function animate() {
            if(animateHeader) {
                ctx.clearRect(0,0,width,height);
                for(var i in points) {
                    // detect points in range
                    if(Math.abs(getDistance(target, points[i])) < 4000) {
                        points[i].active = 0.3;
                        points[i].circle.active = 0.6;
                    } else if(Math.abs(getDistance(target, points[i])) < 20000) {
                        points[i].active = 0.1;
                        points[i].circle.active = 0.3;
                    } else if(Math.abs(getDistance(target, points[i])) < 40000) {
                        points[i].active = 0.02;
                        points[i].circle.active = 0.1;
                    } else {
                        points[i].active = 0;
                        points[i].circle.active = 0;
                    }

                    drawLines(points[i]);
                    points[i].circle.draw();
                }
            }
            requestAnimationFrame(animate);
        }

        function shiftPoint(p) {
            TweenLite.to(p, 1+1*Math.random(), {x:p.originX-50+Math.random()*100,
                y: p.originY-50+Math.random()*100, ease:Circ.easeInOut,
                onComplete: function() {
                    shiftPoint(p);
                }});
        }

        // Canvas manipulation
        function drawLines(p) {
            if(!p.active) return;
            for(var i in p.closest) {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.closest[i].x, p.closest[i].y);
                ctx.strokeStyle = 'rgba(156,217,249,'+ p.active+')';
                ctx.stroke();
            }
        }

        function Circle(pos,rad,color) {
            var _this = this;

            // constructor
            (function() {
                _this.pos = pos || null;
                _this.radius = rad || null;
                _this.color = color || null;
            })();

            this.draw = function() {
                if(!_this.active) return;
                ctx.beginPath();
                ctx.arc(_this.pos.x, _this.pos.y, _this.radius, 0, 2 * Math.PI, false);
                ctx.fillStyle = 'rgba(156,217,249,'+ _this.active+')';
                ctx.fill();
            };
        }

        // Util
        function getDistance(p1, p2) {
            return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
        }
        
    })();

    // Animation state management
    const animations = {
      jobshop: { running: true, canvas: null, ctx: null, animationId: null },
      tsp: { running: true, canvas: null, ctx: null, animationId: null },
      anomaly: { running: true, canvas: null, ctx: null, animationId: null },
      quantum: { running: true, canvas: null, ctx: null, animationId: null }
    };

    // Autoplay system
    const autoplay = {
      enabled: true,
      mode: 'parallel', // Run all animations simultaneously
      duration: 30000, // 30 seconds for full showcase cycle
      intervalId: null,
      pausedByUser: false,
      cycleCount: 0,
      isLooping: true,
      allAnimationsActive: true // All animations run together
    };

    // Job Shop Scheduling Animation
    class JobShopAnimation {
      constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.machines = [];
        this.jobs = [];
        this.time = 0;
        this.init();
      }

      init() {
        this.canvas.width = this.canvas.offsetWidth * 2;
        this.canvas.height = this.canvas.offsetHeight * 2;
        this.ctx.scale(2, 2);

        // Create machines
        for (let i = 0; i < 5; i++) {
          this.machines.push({
            x: 50,
            y: 30 + i * 30,
            width: 500,
            height: 20,
            status: 'active',
            label: `M${i + 1}`,
            currentJob: null
          });
        }

        // Create jobs
        this.createJobs();
      }

      createJobs() {
        const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
        for (let i = 0; i < 10; i++) {
          this.jobs.push({
            id: i + 1,
            x: 50, // Start at the beginning of machine line
            y: 30 + (i % 5) * 30,
            width: 30 + Math.random() * 40,
            height: 18,
            color: colors[i % colors.length],
            speed: 0.5 + Math.random() * 0.5,
            machineIndex: i % 5,
            progress: 0,
            completed: false
          });
        }
      }

      animate() {
        if (!animations.jobshop.running) return;

        this.ctx.clearRect(0, 0, this.canvas.width / 2, this.canvas.height / 2);
        this.time += 0.016;

        // Draw machines
        this.machines.forEach((machine, index) => {
          this.ctx.fillStyle = machine.status === 'active' ? '#34495e' : '#7f8c8d';
          this.ctx.fillRect(machine.x, machine.y, machine.width, machine.height);
          
          // Machine label - positioned on the left side
          this.ctx.fillStyle = '#2c3e50';
          this.ctx.font = 'bold 12px Lato';
          this.ctx.textAlign = 'right';
          this.ctx.fillText(machine.label, machine.x - 8, machine.y + 14);
        });

        // Animate jobs
        this.jobs.forEach(job => {
          if (!job.completed) {
            job.x += job.speed;
            job.progress += job.speed;
            
            // Check if job has reached the end of machine (machine width = 500)
            const machineEndX = 50 + 500; // machine.x (50) + machine.width (500) = 550
            
            if (job.x + job.width >= machineEndX) {
              job.completed = true;
              job.finishTime = this.time;
            }
            
            // Draw job with completion status
            if (job.completed) {
              // Completed job - green with checkmark
              this.ctx.fillStyle = '#2ecc71';
              this.ctx.fillRect(job.x, job.y + 1, job.width, job.height);
              
              // Checkmark
              this.ctx.fillStyle = 'white';
              this.ctx.font = 'bold 12px Lato';
              this.ctx.textAlign = 'center';
              this.ctx.fillText('✓', job.x + job.width/2, job.y + 13);
              
              // Reset job after 2 seconds of completion
              if (this.time - job.finishTime > 2) {
                job.x = 50; // Reset to start of machine line
                job.progress = 0;
                job.completed = false;
                job.speed = 0.5; // New random speed
                delete job.finishTime;
              }
            } else {
              // Active job - original color with progress bar
              this.ctx.fillStyle = job.color;
              this.ctx.fillRect(job.x, job.y + 1, job.width, job.height);
              
              // Progress bar overlay (shows how much of machine width completed)
              const progressPercent = job.progress / 500; // 500 is machine width
              const progressWidth = job.width * Math.min(progressPercent, 1);
              this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
              this.ctx.fillRect(job.x, job.y + 1, progressWidth, job.height);
              
              // Job label
              this.ctx.fillStyle = 'white';
              this.ctx.font = '8px Lato';
              this.ctx.textAlign = 'left';
              this.ctx.fillText(`J${job.id}`, job.x + 5, job.y + 12);
            }
          } else if (!job.finishTime) {
            // Just completed - mark finish time
            job.finishTime = this.time;
          }
        });

        animations.jobshop.animationId = requestAnimationFrame(() => this.animate());
      }

      reset() {
        this.time = 0;
        this.jobs.forEach(job => {
          job.x = 50; // Reset to start of machine line
          job.progress = 0;
          job.completed = false;
          job.speed = 0.5;
          delete job.finishTime;
        });
      }
    }

    // TSP Animation
    class TSPAnimation {
      constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cities = [];
        this.route = [];
        this.vehicle = { x: 0, y: 0, targetIndex: 0, progress: 0 };
        this.time = 0;
        this.mapImage = new Image();
        this.mapLoaded = false;
        
        // Load map background
        this.mapImage.onload = () => {
          this.mapLoaded = true;
        };
        this.mapImage.src = 'static/images/maps.png';
        
        this.init();
      }

      init() {
        this.canvas.width = this.canvas.offsetWidth * 2;
        this.canvas.height = this.canvas.offsetHeight * 2;
        this.ctx.scale(2, 2);

        // Create more cities with horizontal distribution
        const cityPositions = [
          { x: 30, y: 80, label: 'Seoul' },
          { x: 80, y: 60, label: 'Incheon' },
          { x: 130, y: 90, label: 'Suwon' },
          { x: 180, y: 70, label: 'Anyang' },
          { x: 230, y: 85, label: 'Cheonan' },
          { x: 280, y: 65, label: 'Daejeon' },
          { x: 50, y: 120, label: 'Cheongju' },
          { x: 100, y: 135, label: 'Jeonju' },
          { x: 150, y: 125, label: 'Daegu' },
          { x: 200, y: 140, label: 'Gwangju' },
          { x: 250, y: 130, label: 'Busan' },
          { x: 300, y: 115, label: 'Ulsan' }
        ];

        this.cities = cityPositions.map(pos => ({
          ...pos,
          radius: 10,
          color: '#e74c3c',
          visited: false
        }));

        // Create optimized route for horizontal layout (left to right with minimal backtracking)
        this.route = [0, 1, 2, 3, 4, 5, 11, 10, 9, 8, 7, 6, 0];
        this.vehicle.x = this.cities[0].x;
        this.vehicle.y = this.cities[0].y;
      }

      animate() {
        if (!animations.tsp.running) return;

        this.ctx.clearRect(0, 0, this.canvas.width / 2, this.canvas.height / 2);
        this.time += 0.016;

        // Draw map background if loaded, otherwise fallback to solid color
        if (this.mapLoaded) {
          this.ctx.drawImage(this.mapImage, 0, 0, this.canvas.width / 2, this.canvas.height / 2);
          // Add semi-transparent overlay for better visibility
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          this.ctx.fillRect(0, 0, this.canvas.width / 2, this.canvas.height / 2);
        } else {
          this.ctx.fillStyle = '#ecf0f1';
          this.ctx.fillRect(0, 0, this.canvas.width / 2, this.canvas.height / 2);
        }

        // Draw routes with gradient
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width / 2, this.canvas.height / 2);
        gradient.addColorStop(0, '#3498db');
        gradient.addColorStop(1, '#2c3e50');
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 3]);
        this.ctx.beginPath();
        for (let i = 0; i < this.route.length - 1; i++) {
          const from = this.cities[this.route[i]];
          const to = this.cities[this.route[i + 1]];
          if (i === 0) this.ctx.moveTo(from.x, from.y);
          this.ctx.lineTo(to.x, to.y);
        }
        this.ctx.stroke();
        this.ctx.setLineDash([]); // Reset dash

        // Mark visited cities
        const visitedCityIndex = this.route[this.vehicle.targetIndex];
        this.cities[visitedCityIndex].visited = true;

        // Draw cities with enhanced styling
        this.cities.forEach((city, index) => {
          // City shadow
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          this.ctx.beginPath();
          this.ctx.arc(city.x + 2, city.y + 2, city.radius, 0, Math.PI * 2);
          this.ctx.fill();
          
          // City circle
          this.ctx.fillStyle = city.visited ? '#27ae60' : city.color;
          this.ctx.beginPath();
          this.ctx.arc(city.x, city.y, city.radius, 0, Math.PI * 2);
          this.ctx.fill();
          
          // City border
          this.ctx.strokeStyle = '#2c3e50';
          this.ctx.lineWidth = 2;
          this.ctx.stroke();
          
          // City label with background
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          this.ctx.fillRect(city.x - 20, city.y - 25, 40, 14);
          this.ctx.fillStyle = '#2c3e50';
          this.ctx.font = 'bold 8px Lato';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(city.label, city.x, city.y - 16);
        });

        // Animate vehicle
        const currentCityIndex = this.route[this.vehicle.targetIndex];
        const nextCityIndex = this.route[(this.vehicle.targetIndex + 1) % this.route.length];
        const currentCity = this.cities[currentCityIndex];
        const nextCity = this.cities[nextCityIndex];

        this.vehicle.progress += 0.006; // Slower for more cities
        if (this.vehicle.progress >= 1) {
          this.vehicle.progress = 0;
          this.vehicle.targetIndex = (this.vehicle.targetIndex + 1) % this.route.length;
          
          // Reset visited status when completing full tour
          if (this.vehicle.targetIndex === 0) {
            this.cities.forEach(city => city.visited = false);
          }
        }

        // Interpolate vehicle position
        this.vehicle.x = currentCity.x + (nextCity.x - currentCity.x) * this.vehicle.progress;
        this.vehicle.y = currentCity.y + (nextCity.y - currentCity.y) * this.vehicle.progress;

        // Draw enhanced vehicle
        // Vehicle shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(this.vehicle.x - 6, this.vehicle.y - 3, 12, 8);
        
        // Vehicle body
        this.ctx.fillStyle = '#f39c12';
        this.ctx.fillRect(this.vehicle.x - 8, this.vehicle.y - 5, 16, 10);
        
        // Vehicle cab
        this.ctx.fillStyle = '#3498db';
        this.ctx.fillRect(this.vehicle.x - 6, this.vehicle.y - 3, 12, 6);
        
        // Vehicle direction indicator
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.beginPath();
        this.ctx.arc(this.vehicle.x + 6, this.vehicle.y, 2, 0, Math.PI * 2);
        this.ctx.fill();

        animations.tsp.animationId = requestAnimationFrame(() => this.animate());
      }

      reset() {
        this.vehicle.x = this.cities[0].x;
        this.vehicle.y = this.cities[0].y;
        this.vehicle.targetIndex = 0;
        this.vehicle.progress = 0;
        this.cities.forEach(city => city.visited = false);
        this.time = 0;
      }
    }

    // Anomaly Detection Animation
    class AnomalyAnimation {
      constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.dataPoints = [];
        this.anomalies = [];
        this.time = 0;
        this.init();
      }

      init() {
        this.canvas.width = this.canvas.offsetWidth * 2;
        this.canvas.height = this.canvas.offsetHeight * 2;
        this.ctx.scale(2, 2);

        // Generate initial data points
        for (let i = 0; i < 100; i++) {
          this.dataPoints.push({
            x: i * 3,
            y: 90 + Math.sin(i * 0.1) * 30 + (Math.random() - 0.5) * 10,
            isAnomaly: Math.random() < 0.05
          });
        }
      }

      animate() {
        if (!animations.anomaly.running) return;

        this.ctx.clearRect(0, 0, this.canvas.width / 2, this.canvas.height / 2);
        this.time += 0.016;

        // Draw background
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, this.canvas.width / 2, this.canvas.height / 2);

        // Draw threshold bands
        this.ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
        this.ctx.fillRect(0, 50, this.canvas.width / 2, 20);
        this.ctx.fillRect(0, 110, this.canvas.width / 2, 20);

        // Draw normal data line
        this.ctx.strokeStyle = '#2ecc71';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.dataPoints.forEach((point, index) => {
          if (!point.isAnomaly) {
            if (index === 0) this.ctx.moveTo(point.x, point.y);
            else this.ctx.lineTo(point.x, point.y);
          }
        });
        this.ctx.stroke();

        // Draw anomalies
        this.dataPoints.forEach(point => {
          if (point.isAnomaly) {
            this.ctx.fillStyle = '#e74c3c';
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 4 + Math.sin(this.time * 5) * 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Anomaly glow
            this.ctx.strokeStyle = 'rgba(231, 76, 60, 0.5)';
            this.ctx.lineWidth = 8;
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
            this.ctx.stroke();
          }
        });

        // Add new data point
        if (Math.floor(this.time * 10) % 5 === 0) {
          this.dataPoints.shift();
          this.dataPoints.push({
            x: 297,
            y: 90 + Math.sin(this.dataPoints.length * 0.1) * 30 + (Math.random() - 0.5) * 10,
            isAnomaly: Math.random() < 0.08
          });
        }

        animations.anomaly.animationId = requestAnimationFrame(() => this.animate());
      }

      reset() {
        this.time = 0;
        this.dataPoints = [];
        this.init();
      }
    }

    // Quantum Computing Animation
    class QuantumAnimation {
      constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.qubits = [];
        this.connections = [];
        this.time = 0;
        this.init();
      }

      init() {
        this.canvas.width = this.canvas.offsetWidth * 2;
        this.canvas.height = this.canvas.offsetHeight * 2;
        this.ctx.scale(2, 2);

        // Create qubits
        const positions = [
          { x: 70, y: 50 },
          { x: 170, y: 40 },
          { x: 230, y: 80 },
          { x: 120, y: 120 }
        ];

        this.qubits = positions.map((pos, index) => ({
          x: pos.x,
          y: pos.y,
          radius: 20,
          phase: index * Math.PI / 2,
          state: 0.5, // Superposition
          entangled: index < 2 ? 1 - index : null
        }));
      }

      animate() {
        if (!animations.quantum.running) return;

        this.ctx.clearRect(0, 0, this.canvas.width / 2, this.canvas.height / 2);
        this.time += 0.016;

        // Draw quantum field background
        const gradient = this.ctx.createRadialGradient(150, 90, 0, 150, 90, 200);
        gradient.addColorStop(0, 'rgba(155, 89, 182, 0.1)');
        gradient.addColorStop(1, 'rgba(142, 68, 173, 0.05)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width / 2, this.canvas.height / 2);

        // Draw entanglement connections
        this.qubits.forEach((qubit, index) => {
          if (qubit.entangled !== null) {
            const partner = this.qubits[qubit.entangled];
            this.ctx.strokeStyle = `rgba(155, 89, 182, ${0.5 + Math.sin(this.time * 3) * 0.3})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(qubit.x, qubit.y);
            this.ctx.lineTo(partner.x, partner.y);
            this.ctx.stroke();
          }
        });

        // Draw qubits
        this.qubits.forEach((qubit, index) => {
          const oscillation = Math.sin(this.time * 2 + qubit.phase);
          
          // Qubit sphere
          this.ctx.fillStyle = `rgba(155, 89, 182, ${0.7 + oscillation * 0.3})`;
          this.ctx.beginPath();
          this.ctx.arc(qubit.x, qubit.y, qubit.radius, 0, Math.PI * 2);
          this.ctx.fill();

          // Inner state
          this.ctx.fillStyle = oscillation > 0 ? '#3498db' : '#e74c3c';
          this.ctx.beginPath();
          this.ctx.arc(qubit.x, qubit.y, qubit.radius * 0.6, 0, Math.PI * 2);
          this.ctx.fill();

          // State vector
          this.ctx.strokeStyle = 'white';
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.moveTo(qubit.x, qubit.y);
          this.ctx.lineTo(
            qubit.x + Math.cos(this.time + qubit.phase) * qubit.radius * 0.8,
            qubit.y + Math.sin(this.time + qubit.phase) * qubit.radius * 0.8
          );
          this.ctx.stroke();

          // Qubit label
          this.ctx.fillStyle = 'white';
          this.ctx.font = 'bold 10px Lato';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(`Q${index}`, qubit.x, qubit.y + 3);
        });

        animations.quantum.animationId = requestAnimationFrame(() => this.animate());
      }

      reset() {
        this.time = 0;
        this.qubits.forEach(qubit => {
          qubit.state = 0.5;
        });
      }
    }

    // Page navigation
    let currentPage = 0;
    const overlays = ['', 'about-overlay', 'services-overlay', 'contact-overlay'];

    function switchPage(index) {
      document.querySelectorAll('.nav-button').forEach(btn => {
        btn.classList.remove('active');
      });
      
      const navButtons = document.querySelectorAll('.nav-button');
      navButtons[index].classList.add('active');
      
      if (index === 0) {
        document.querySelectorAll('.page-overlay').forEach(overlay => {
          overlay.classList.remove('active');
        });
      } else {
        document.querySelectorAll('.page-overlay').forEach(overlay => {
          overlay.classList.remove('active');
        });
        document.getElementById(overlays[index]).classList.add('active');
      }
      
      currentPage = index;
    }

    // Autoplay system functions
    function startAutoplay() {
      if (!autoplay.enabled) return;
      
      // Start all animations immediately
      startAllAnimations();
      
      // Set interval to restart all animations periodically
      autoplay.intervalId = setInterval(() => {
        if (!autoplay.pausedByUser) {
          restartAllAnimations();
        }
      }, autoplay.duration);
    }

    function stopAutoplay() {
      if (autoplay.intervalId) {
        clearInterval(autoplay.intervalId);
        autoplay.intervalId = null;
      }
    }

    function startAllAnimations() {
      // Resume all animations simultaneously - but don't start multiple loops
      Object.keys(animations).forEach(type => {
        animations[type].running = true;
        const btn = document.querySelector(`.${type}-card .control-btn`);
        if (btn) btn.textContent = '⏸';
        
        // Add active visual state to all cards
        const card = document.querySelector(`.${type}-card`);
        if (card) card.classList.add('autoplay-active');
      });
      
      // Only start animation loops if they haven't been started yet
      // (This prevents multiple loops from running simultaneously)
    }

    function restartAllAnimations() {
      autoplay.cycleCount++;
      console.log(`Autoplay cycle ${autoplay.cycleCount} - Restarting all animations simultaneously`);
      
      // Reset all animations (this stops current loops)
      if (jobShopAnim) jobShopAnim.reset();
      if (tspAnim) tspAnim.reset();
      if (anomalyAnim) anomalyAnim.reset();
      if (quantumAnim) quantumAnim.reset();
      
      // Show cycle completion effect
      showCycleCompletionEffect();
      
      // Restart all animations after brief pause (start new single loops)
      setTimeout(() => {
        // Ensure animations are marked as running
        Object.keys(animations).forEach(type => {
          animations[type].running = true;
        });
        
        // Start fresh animation loops
        if (jobShopAnim) jobShopAnim.animate();
        if (tspAnim) tspAnim.animate();
        if (anomalyAnim) anomalyAnim.animate();
        if (quantumAnim) quantumAnim.animate();
        
        updateCycleCounter();
      }, 500);
    }

    function updateAutoplayIndicators() {
      // In parallel mode, all cards should be active
      if (autoplay.enabled && autoplay.mode === 'parallel') {
        document.querySelectorAll('.animation-card').forEach(card => {
          card.classList.add('autoplay-active');
        });
      } else {
        document.querySelectorAll('.animation-card').forEach(card => {
          card.classList.remove('autoplay-active');
        });
      }
    }

    function showCycleCompletionEffect() {
      // Brief visual effect when completing a cycle
      document.querySelectorAll('.animation-card').forEach(card => {
        card.style.animation = 'cycleComplete 0.6s ease-in-out';
        setTimeout(() => {
          card.style.animation = '';
        }, 600);
      });
    }

    function updateCycleCounter() {
      const autoplayBtn = document.getElementById('autoplay-toggle');
      if (autoplayBtn && autoplay.cycleCount > 0) {
        const baseText = autoplay.enabled ? '⏸ All' : '▶ All';
        const cycleText = ` (${autoplay.cycleCount})`;
        autoplayBtn.innerHTML = `${baseText}<small style="font-size: 0.7em; opacity: 0.8;">${cycleText}</small>`;
      }
    }

    function toggleAutoplay() {
      autoplay.enabled = !autoplay.enabled;
      const autoplayBtn = document.getElementById('autoplay-toggle');
      
      if (autoplay.enabled) {
        startAutoplay();
        autoplayBtn.innerHTML = '⏸ All';
        autoplayBtn.title = 'Pause All Animations';
      } else {
        stopAutoplay();
        // Stop all animations
        Object.keys(animations).forEach(type => {
          animations[type].running = false;
          const btn = document.querySelector(`.${type}-card .control-btn`);
          if (btn) btn.textContent = '▶';
        });
        autoplayBtn.innerHTML = '▶ All';
        autoplayBtn.title = 'Start All Animations';
      }
      
      updateAutoplayIndicators();
      updateCycleCounter();
    }

    function toggleAnimation(type) {
      // Mark as manually controlled
      autoplay.pausedByUser = !animations[type].running;
      
      animations[type].running = !animations[type].running;
      const btn = document.querySelector(`.${type}-card .control-btn`);
      btn.textContent = animations[type].running ? '⏸' : '▶';
      
      if (animations[type].running) {
        if (type === 'jobshop') jobShopAnim.animate();
        else if (type === 'tsp') tspAnim.animate();
        else if (type === 'anomaly') anomalyAnim.animate();
        else if (type === 'quantum') quantumAnim.animate();
      }
      
      // Reset user pause after 10 seconds
      if (autoplay.pausedByUser) {
        setTimeout(() => {
          autoplay.pausedByUser = false;
        }, 10000);
      }
    }

    function resetAnimation(type) {
      if (type === 'jobshop') jobShopAnim.reset();
      else if (type === 'tsp') tspAnim.reset();
      else if (type === 'anomaly') anomalyAnim.reset();
      else if (type === 'quantum') quantumAnim.reset();
    }

    // Initialize animations
    let jobShopAnim, tspAnim, anomalyAnim, quantumAnim;

    document.addEventListener('DOMContentLoaded', function() {
      // Initialize canvases
      animations.jobshop.canvas = document.getElementById('jobshopCanvas');
      animations.tsp.canvas = document.getElementById('tspCanvas');
      animations.anomaly.canvas = document.getElementById('anomalyCanvas');
      animations.quantum.canvas = document.getElementById('quantumCanvas');

      // Create animation instances
      jobShopAnim = new JobShopAnimation(animations.jobshop.canvas);
      tspAnim = new TSPAnimation(animations.tsp.canvas);
      anomalyAnim = new AnomalyAnimation(animations.anomaly.canvas);
      quantumAnim = new QuantumAnimation(animations.quantum.canvas);

      // Initialize autoplay system for parallel mode
      if (autoplay.enabled) {
        // All animations start running simultaneously
        Object.keys(animations).forEach(type => {
          animations[type].running = true;
          const btn = document.querySelector(`.${type}-card .control-btn`);
          if (btn) btn.textContent = '⏸';
        });
        
        // Set all cards as active
        updateAutoplayIndicators();
        
        // Start autoplay timer for periodic restarts
        startAutoplay();
        
        // Start all animations initially (only once)
        jobShopAnim.animate();
        tspAnim.animate();
        anomalyAnim.animate();
        quantumAnim.animate();
      } else {
        // Start all animations if autoplay is disabled
        jobShopAnim.animate();
        tspAnim.animate();
        anomalyAnim.animate();
        quantumAnim.animate();
      }

      // Initialize typing animation
      window.ityped.init(document.querySelector('.ityped'), {
        strings: [
          'Manufacturing Optimization Scheduling',
          'Route Planning & Optimization',
          'Time Series Anomaly Detection and Fault Detection',
          'Quantum Computing Algorithms',
          'Machine Learning Integration',
          'Advanced Data Analytics',
          'Real-time Processing Systems'
        ],
        loop: true,
        typeSpeed: 80,
        backSpeed: 40,
        backDelay: 2000,
        startDelay: 500
      });

      switchPage(0);
    });

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowLeft' && currentPage > 0) {
        switchPage(currentPage - 1);
      } else if (e.key === 'ArrowRight' && currentPage < 3) {
        switchPage(currentPage + 1);
      }
    });

    // Handle window resize
    window.addEventListener('resize', function() {
      setTimeout(() => {
        if (jobShopAnim) jobShopAnim.init();
        if (tspAnim) tspAnim.init();
        if (anomalyAnim) anomalyAnim.init();
        if (quantumAnim) quantumAnim.init();
      }, 100);
    });

    // Authentication Functions
    function showLoginForm() {
      document.getElementById('loginForm').style.display = 'block';
      document.getElementById('registerForm').style.display = 'none';
      
      // Update tab states
      const tabs = document.querySelectorAll('.auth-tab');
      tabs.forEach(tab => tab.classList.remove('active'));
      tabs[0].classList.add('active');
    }

    function showRegisterForm() {
      document.getElementById('loginForm').style.display = 'none';
      document.getElementById('registerForm').style.display = 'block';
      
      // Update tab states
      const tabs = document.querySelectorAll('.auth-tab');
      tabs.forEach(tab => tab.classList.remove('active'));
      tabs[1].classList.add('active');
    }

    function handleLogin(event) {
      event.preventDefault();
      
      const formData = new FormData(event.target);
      const email = formData.get('email');
      const password = formData.get('password');
      const rememberMe = document.getElementById('rememberMe').checked;
      
      // Show loading state
      const submitBtn = event.target.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Signing In...';
      submitBtn.disabled = true;
      
      // Simulate API call
      setTimeout(() => {
        console.log('Login attempt:', { email, password, rememberMe });
        
        // Simulate successful login
        showNotification('Login successful! Welcome back.', 'success');
        
        // Reset form and close overlay
        event.target.reset();
        switchPage(0);
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
        // Store user session (in real app, this would be handled by backend)
        if (rememberMe) {
          localStorage.setItem('userSession', JSON.stringify({ email, loginTime: new Date() }));
        } else {
          sessionStorage.setItem('userSession', JSON.stringify({ email, loginTime: new Date() }));
        }
      }, 1500);
    }

    function handleRegister(event) {
      event.preventDefault();
      
      const formData = new FormData(event.target);
      const firstName = formData.get('firstName');
      const lastName = formData.get('lastName');
      const email = formData.get('email');
      const password = formData.get('password');
      const confirmPassword = formData.get('confirmPassword');
      
      // Validate password match
      if (password !== confirmPassword) {
        showNotification('Passwords do not match!', 'error');
        return;
      }
      
      // Validate password strength
      if (password.length < 8) {
        showNotification('Password must be at least 8 characters long!', 'error');
        return;
      }
      
      // Show loading state
      const submitBtn = event.target.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Creating Account...';
      submitBtn.disabled = true;
      
      // Simulate API call
      setTimeout(() => {
        console.log('Registration attempt:', { firstName, lastName, email });
        
        // Simulate successful registration
        showNotification('Account created successfully! Please check your email to verify.', 'success');
        
        // Switch to login form
        showLoginForm();
        
        // Pre-fill email in login form
        document.getElementById('loginEmail').value = email;
        
        // Reset form
        event.target.reset();
        
        // Reset button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }, 1500);
    }

    function handleGoogleLogin(response) {
      console.log('Google login response:', response);
      
      // Decode JWT token (in real app, send to backend for verification)
      try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        console.log('Google user info:', payload);
        
        showNotification(`Welcome ${payload.name}! Logged in with Google.`, 'success');
        
        // Store user session
        sessionStorage.setItem('userSession', JSON.stringify({
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          provider: 'google',
          loginTime: new Date()
        }));
        
        // Close overlay and return to home
        switchPage(0);
      } catch (error) {
        console.error('Error processing Google login:', error);
        showNotification('Google login failed. Please try again.', 'error');
      }
    }

    function handleGoogleSignup() {
      // Initialize Google Sign-In for registration
      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          showNotification('Please allow popups and try again', 'error');
        }
      });
    }

    function showNotification(message, type = 'info') {
      // Create notification element
      const notification = document.createElement('div');
      notification.className = `notification notification-${type}`;
      notification.textContent = message;
      
      // Add styles
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      `;
      
      // Set background color based on type
      const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        info: '#3498db',
        warning: '#f39c12'
      };
      notification.style.backgroundColor = colors[type] || colors.info;
      
      // Add to DOM
      document.body.appendChild(notification);
      
      // Animate in
      setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
      }, 100);
      
      // Remove after delay
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }, 4000);
    }

    // Check if user is already logged in
    function checkUserSession() {
      const session = localStorage.getItem('userSession') || sessionStorage.getItem('userSession');
      if (session) {
        try {
          const userData = JSON.parse(session);
          console.log('User session found:', userData);
          // Update UI to show logged in state
          updateNavForLoggedInUser(userData);
        } catch (error) {
          console.error('Error parsing user session:', error);
          // Clear invalid session
          localStorage.removeItem('userSession');
          sessionStorage.removeItem('userSession');
        }
      }
    }

    function updateNavForLoggedInUser(userData) {
      const loginButton = document.querySelector('.nav-button');
      if (loginButton && loginButton.textContent.includes('Login')) {
        loginButton.textContent = userData.name || userData.email || 'Profile';
        loginButton.onclick = () => showUserProfile(userData);
      }
    }

    function showUserProfile(userData) {
      showNotification(`Logged in as: ${userData.name || userData.email}`, 'info');
    }

    function logout() {
      localStorage.removeItem('userSession');
      sessionStorage.removeItem('userSession');
      showNotification('Logged out successfully', 'success');
      
      // Reset nav button
      const loginButton = document.querySelector('.nav-button');
      if (loginButton) {
        loginButton.textContent = 'Login/Register';
        loginButton.onclick = () => switchPage(1);
      }
    }

    // Make functions globally available
    window.showLoginForm = showLoginForm;
    window.showRegisterForm = showRegisterForm;
    window.handleLogin = handleLogin;
    window.handleRegister = handleRegister;
    window.handleGoogleLogin = handleGoogleLogin;
    window.handleGoogleSignup = handleGoogleSignup;
    window.logout = logout;

    // Initialize authentication system
    checkUserSession();