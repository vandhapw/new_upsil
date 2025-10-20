// Horizontal scroll with progress indicator and wheel support
document.addEventListener('DOMContentLoaded', function() {
    const scroller = document.getElementById("scroller");
    const scrollerWrapper = document.querySelector(".scroller-wrapper");
    const scrollProgress = document.getElementById("scroll-progress");

    console.log('ImageScroll.js loaded', { scroller, scrollerWrapper, scrollProgress });

    if (scroller && scrollerWrapper && scrollProgress) {
        // Update progress bar on scroll
        function updateScrollProgress() {
            const scrollPercent = (scrollerWrapper.scrollLeft / (scrollerWrapper.scrollWidth - scrollerWrapper.clientWidth)) * 100;
            scrollProgress.style.width = Math.max(0, Math.min(100, scrollPercent)) + "%";
        }

        // Handle scroll events on the wrapper
        scrollerWrapper.addEventListener("scroll", updateScrollProgress);

        // Enhanced wheel event handler with better detection
        function handleWheelScroll(event) {
            // Check if we can scroll horizontally
            if (scrollerWrapper.scrollWidth > scrollerWrapper.clientWidth) {
                event.preventDefault(); // Prevent vertical scrolling
                event.stopPropagation(); // Stop event bubbling
                
                console.log('Wheel event detected:', event.deltaY);
                
                // Smooth horizontal scrolling
                const scrollAmount = event.deltaY * 2; // Adjust multiplier
                scrollerWrapper.scrollLeft += scrollAmount;
                
                // Update progress immediately
                updateScrollProgress();
                
                return false;
            }
        }

        // Add wheel event to multiple elements for better coverage
        const elementsToAttach = [
            scrollerWrapper,
            document.querySelector('.overlay-container'),
            scroller
        ];

        elementsToAttach.forEach(element => {
            if (element) {
                element.addEventListener("wheel", handleWheelScroll, { 
                    passive: false, 
                    capture: true 
                });
                
                // Also add mousewheel for older browsers
                element.addEventListener("mousewheel", handleWheelScroll, { 
                    passive: false, 
                    capture: true 
                });
                
                console.log('Wheel events attached to:', element.className || element.id);
            }
        });

        // Alternative approach: Add wheel event to document and check if target is within our container
        document.addEventListener("wheel", function(event) {
            const overlayContainer = document.querySelector('.overlay-container');
            if (overlayContainer && overlayContainer.contains(event.target)) {
                if (scrollerWrapper.scrollWidth > scrollerWrapper.clientWidth) {
                    event.preventDefault();
                    event.stopPropagation();
                    
                    const scrollAmount = event.deltaY * 2;
                    scrollerWrapper.scrollLeft += scrollAmount;
                    updateScrollProgress();
                    
                    console.log('Document wheel scroll triggered');
                }
            }
        }, { passive: false });

        // Add CSS to ensure proper pointer events
        if (scrollerWrapper) {
            scrollerWrapper.style.pointerEvents = 'auto';
            scrollerWrapper.style.touchAction = 'pan-x';
        }

        // Handle keyboard navigation on the wrapper
        scrollerWrapper.addEventListener("keydown", function (event) {
            switch (event.key) {
                case "ArrowLeft":
                    event.preventDefault();
                    scrollerWrapper.scrollLeft -= 100;
                    break;
                case "ArrowRight":
                    event.preventDefault();
                    scrollerWrapper.scrollLeft += 100;
                    break;
                case "Home":
                    event.preventDefault();
                    scrollerWrapper.scrollLeft = 0;
                    break;
                case "End":
                    event.preventDefault();
                    scrollerWrapper.scrollLeft = scrollerWrapper.scrollWidth;
                    break;
            }
            updateScrollProgress();
        });

        // Make scroller wrapper focusable for keyboard navigation
        scrollerWrapper.setAttribute("tabindex", "0");

        // Touch/swipe support for mobile
        let startX = 0;
        let scrollStart = 0;

        scrollerWrapper.addEventListener("touchstart", function (event) {
            startX = event.touches[0].clientX;
            scrollStart = scrollerWrapper.scrollLeft;
        });

        scrollerWrapper.addEventListener("touchmove", function (event) {
            if (!startX) return;
            
            event.preventDefault();
            const currentX = event.touches[0].clientX;
            const diffX = startX - currentX;
            scrollerWrapper.scrollLeft = scrollStart + diffX;
        });

        scrollerWrapper.addEventListener("touchend", function () {
            startX = 0;
            scrollStart = 0;
            updateScrollProgress();
        });

        // Initialize progress bar
        updateScrollProgress();

        // Add click handlers for individual scroll items
        const scrollItems = scroller.querySelectorAll('li');
        scrollItems.forEach((item, index) => {
            item.addEventListener('click', function() {
                // Optional: Add click behavior for scroll items
                console.log(`Clicked item ${index + 1}: ${item.textContent}`);
                
                // Example: Scroll to center the clicked item
                const itemRect = item.getBoundingClientRect();
                const containerRect = scrollerWrapper.getBoundingClientRect();
                const scrollLeft = scrollerWrapper.scrollLeft + itemRect.left - containerRect.left - (containerRect.width / 2) + (itemRect.width / 2);
                
                scrollerWrapper.scrollTo({
                    left: scrollLeft,
                    behavior: 'smooth'
                });
                
                // Update progress after smooth scroll
                setTimeout(updateScrollProgress, 300);
            });
        });

        // Handle window resize
        window.addEventListener('resize', updateScrollProgress);
    }
});