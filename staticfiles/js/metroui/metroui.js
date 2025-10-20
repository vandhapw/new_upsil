function materialBoxResize(){
		// if ($(window).width() >= 751) {}
		if ($(window).width() >= 767) {
			$('.metro-box-xl').css({
				'height': (($('.metro-box-1').height())*2) + 10
			});

			$('.metro-box-xl .metro-box-inner').css({
				'height': (($('.metro-box-1').height())*2) + 10
			});

			$('.metro-box .back').css({
				'height': (($('.metro-box-1').height())*2) + 10
			});

			$('.metro-box .back').css({
				'height': ($('.metro-box-1').height())
			});

			$('.metro-box-xl .back').css({
				'height': (($('.metro-box-1').height())*2) + 10
			});

			$('.metro-box.bottom-space-fix').css({
				'position': 'absolute',
				'bottom' : '0',
				'width' : (($('.metro-box-2').width()) + 10)
			});

			$('.my-cards ul').css({
				'height': ($('.c-card-input').height()),
				'max-height': '181px',
				'overflow-y' : 'scroll',
			});

			$( ".flipper .back" ).removeClass( "collapse" );

			// $( ".flip-container .flipper" ).removeAttr('data-toggle, data-parent, data-target')
		} else{
			$('.metro-box-xl').css({
				'height': 'auto'
			});
			
			$('.metro-box-xl .metro-box-inner').css({
				'height': 'auto'
			});

			$('.metro-box.bottom-space-fix').css({
				'position': 'unset',
				'bottom' : 'auto',
				'width' : 'auto'
			});

			$('.metro-box').css({
				'width': '100%',
				'max-width' : 'unset'
			});

			$( ".flipper .front .question-container" ).css({
				'width': $('.metro-box-1').width(),
			});

			$( ".header-box .question-container" ).css({
				'width': $('.metro-box-1').width(),
				'height': $('.metro-box-1').height(),
			});

			// $( ".flipper .back" ).addClass( "collapse" );

			var acc = document.getElementsByClassName("front");
			var panel = document.getElementsByClassName('back');

			for (var i = 0; i < acc.length; i++) {
				acc[i].onclick = function() {
					var setClasses = !this.classList.contains('active');
					setClass(acc, 'active', 'remove');
					setClass(panel, 'show', 'remove');

					if (setClasses) {
						this.classList.toggle("active");
						this.nextElementSibling.classList.toggle("show");
					}
				}
			}

			function setClass(els, className, fnName) {
				for (var i = 0; i < els.length; i++) {
					els[i].classList[fnName](className);
				}
			}
		}
	}

	materialBoxResize();

	$(window).load(function () {
		materialBoxResize();
	});

	$(window).resize(function () {
		materialBoxResize();
		if ($(window).width() > 766 && $(window).width() < 800) {
			location.reload();
		} else {}
	});