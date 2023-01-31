(function(window, document, $, undefined){

    //Course specific variables for linking to 508 script, resources, and glossary
    //var link_508 = "../common/JS-US002-508Script.pdf";
    var link_resources = "../common/resources.html";
    var link_glossary = "../common/glossary.html";   
    
    //sound effect to play on button clicks (meant to mimic Captivate)
    //comment out if not using
    //var btnClickSound = new Audio('../media/sounds/Mouse.mp3');

    var showResume;
    var expand = 0; //this is the variable that tells us what topic to expand
    var checkLessonCompletionFlag=false;
    var lessonCompleted=false;
    var nextUnlocked = true;
    var currentPage = 0;
    var totalPages = 0;
    var sessionPageProgress = -1;//track the highest page number viewed to make next locking more custom
    var transcriptOpen = false;
    var resetTranscriptScroll = false;
    var audioPlayerRef = null;
    var pageProgressInterval = null;
    var $progressBar;
    var progressBarMaxWidth;
    var $pageContentFrame;
    var $navBackBtn;
    var $navNextBtn;
    var $helpBtn;
    var $glossaryBtn;
    var $resourcesBtn;
    var $audioTranscriptBtn;
    var $playBtn;
    var $pauseBtn;
    var $rewindBtn;
    var $508Btn
    var useFadeTransitions = true;
    var ccBoxShouldRemainOpen = false; //if the user opens the transcript box, it will remain open until the user closes it (from page to page, unless a page doesn't have narration)
    
    $(document).ready(onLoadFunctions);
    
    window.onbeforeunload = onBeforeUnloadFunctions;
    
    function onLoadFunctions(e){
        //Functions called in old scorm.html in the body onload event
        doLMSInitialize();
        doLMSSetValue('cmi.completion_status','incomplete');

        $pageContentFrame = $('#pageContentFrame');
        $navBackBtn = $('#nav_back');
        $navNextBtn = $('#nav_next');
        $helpBtn = $('#subnav_help');
        $glossaryBtn = $('#subnav_glossary');
        $resourcesBtn = $('#subnav_resources');
        $audioTranscriptBtn = $('#audio_transcript');
        $playBtn = $('#pageControl_play');
        $pauseBtn = $('#pageControl_pause');
        $rewindBtn = $('#pageControl_rewind');
        $508Btn = $('#subnav_508');
        
        if(useFadeTransitions){
            $pageContentFrame.css("opacity", 0);
        }
        

        disableBack();
        getProgress();
        
        disableNext();
        setupButtons();

        //See if there is a progress bar and if so, set it up
        if(typeof $('#progressBar')[0] !== 'undefined'){
            $progressBar = $('#progressBar');
            progressBarMaxWidth = $progressBar.width();
            $progressBar.width("0");
        }

        if(window.location.hostname === "jkodirect.jten.mil"){
            //To allow NEXT unlocking by holding down CTRL + ALT and clicking the page number text
            enableUnlockingKeycodes();
        }
    }
    
    function onBeforeUnloadFunctions(e){
        //Functions called in old scorm.html in the body onunload event
        setSuspendData();
        doLMSCommit();
        doLMSFinish();
        
        //debug to make sure the function is being called
        //e.returnValue = "beforeunload";
    }
    
    //Get the progress from the suspend data
    //Simplified from the old wrapper
    function getProgress(){
        var suspendStr = doLMSGetValue("cmi.suspend_data");
        
        if(suspendStr !== ""){
            //Lesson has been started before, get progress
            //For now group the suspend data seperated by '|'
            //Within groups of data seperate by ','
            var suspendDataGroups = suspendStr.split('|');
            
            //Store the index of the current page as the first data group
            //This index corresponds to the index of the progress array
            currentPage = parseInt(suspendDataGroups[0], 10);
        }
        
        //set the total number of pages
        totalPages = progress.length;
        $('#totPage').text(totalPages.toString());
        
        var url = progress[currentPage].url;
        var title = progress[currentPage].title;

        //If starting on a page after the first page, set sessionPageProgress to currentPage - 1
        //Because, a page could be bookmarked before it is complete
        if(currentPage > 0){
            sessionPageProgress = currentPage - 1;
        }
        
        changePage(url, title, currentPage);
    }
    
    //Set the suspend data
    function setSuspendData(){
        
        if(checkLessonCompletionFlag==false){
            doLMSSetValue("cmi.exit", "suspend");
        }
        
        //For now the only thing in the suspend data is the currentPage
        //If other data is needed seperate data groups with '|', and within groups seperate with ','
        doLMSSetValue("cmi.suspend_data", currentPage.toString());
    }
    
    //Go to the next page
    function next() {
        if(nextUnlocked){

            if(currentPage < totalPages - 1) {
                disableNext();
                hideContent();
                currentPage++;
                
                var url = progress[currentPage].url;
                var title = progress[currentPage].title;
                changePage(url, title, currentPage);
            }
            else{
                alert("You are at the last page");
            }
        }
        else{
            alert("The page content must be viewed before proceeding. Click the \"NEXT\" button when highlighted to continue.");
        }
    }
    
    //Go to the previous page
    function back() {
        if(currentPage > 0) {
            hideContent();
            currentPage--;
            var url = progress[currentPage].url;
            var title = progress[currentPage].title;
            changePage(url, title, currentPage);
            //enableNext(); //assumes you have completed this page already
        }else{
            alert("You are at the first page");
        }
    }
    
    //Change the src attr of the iframe, also change the page title and page number
    function changePage(url, pageTitle, pageNum){

        var contentFrame = $pageContentFrame;
        var title = $('#pageTitle');
        var curPageNum = $('#currPage');
        
        closeTranscriptBox();
        contentFrame.attr('src', url);
        title.text(pageTitle);
        curPageNum.text((pageNum + 1).toString());
        
        updateLocation(url);
		checkLessonCompletion();

        updateTranscriptText();

        //sessionPageProgress gets set after enableNext is called, so <= should be ok here
        if(currentPage <= sessionPageProgress){
            enableNext();
        }

        if(currentPage > 0){
            enableBack();
        }
        else{
            disableBack();
        }

        //disable the audio controls, if the page has audio, it will call the function to enable the controls
        disableAudioControls();
    }
    
    //Wrapper button events
    function setupButtons(){
        
        //load the over state images
        var imgRoot = '../css/images/';
        var backOver = new Image();
        //var backDown = new Image();
        var nextOver = new Image();
        //var nextDown = new Image();
        var helpOver = new Image();
        //var helpDown = new Image();
        var glossaryOver = new Image();
        //var glossaryDown = new Image();
        var resourcesOver = new Image();
        //var resourcesDown = new Image();
        var transcriptOver = new Image();
        //var transcriptDown = new Image();
        var playOver = new Image();
        //var playDown = new Image();
        var pauseOver = new Image();
        //var pauseDown = new Image();
        var rewindOver = new Image();
        //var rewindDown = new Image();
        //508 button
        var btn508Over = new Image();
        //var btn508Down = new Image();

        var backUpSrc = $navBackBtn.children('img').attr('src');
        backOver.src = imgRoot + 'UI_btn_back_hover.png';
        //backDown.src = imgRoot + 'back_Down.jpg';
        
        var nextUpSrc = $navNextBtn.children('img').attr('src');
        nextOver.src = imgRoot + 'UI_btn_next_hover.png';
        //nextDown.src = imgRoot + 'next_Down.jpg';
        
        var helpUpSrc = $helpBtn.children('img').attr('src');
        helpOver.src = imgRoot + 'UI_btn_help_hover.png';
        //helpDown.src = imgRoot + 'help_Down.jpg';
        
        var glossaryUpSrc = $glossaryBtn.children('img').attr('src');
        glossaryOver.src = imgRoot + 'UI_btn_glossary_hover.png';
        //glossaryDown.src = imgRoot + 'glossary_Down.jpg';
        
        var resourcesUpSrc = $resourcesBtn.children('img').attr('src');
        resourcesOver.src = imgRoot + 'UI_btn_resources_hover.png';
        //resourcesDown.src = imgRoot + 'resources_Down.jpg';
        
        var transcriptUpSrc = $audioTranscriptBtn.children('img').attr('src');
        transcriptOver.src = imgRoot + 'UI_btn_cc_hover.png';
        //transcriptDown.src = imgRoot + 'CC_Down.jpg';

        var playUpSrc = $playBtn.children('img').attr('src');
        playOver.src = imgRoot + 'UI_btn_play_hover.png';
        //playDown.src = imgRoot + 'play_Down.jpg';

        var pauseUpSrc = $pauseBtn.children('img').attr('src');
        pauseOver.src = imgRoot + 'UI_btn_pause_hover.png';
        //pauseDown.src = imgRoot + 'pause_Down.jpg';

        var rewindUpSrc = $rewindBtn.children('img').attr('src');
        rewindOver.src = imgRoot + 'UI_btn_rewind_hover.png';
        //rewindDown.src = imgRoot + 'rewind_Down.jpg';

        //508 button 
        var btn508UpSrc = $508Btn.children('img').attr('src');
        btn508Over.src = imgRoot + 'UI_btn_508_hover.png';
        //btn508Down.src = imgRoot + '508_Down.jpg';
        
        //next
        $navNextBtn.on("click", function(){
            next();
            playButtonSound();
        });

        $navNextBtn.on("mouseover", function(){
            $(this).children('img').attr('src', nextOver.src);
        });
        $navNextBtn.on("mouseout", function(){
            $(this).children('img').attr('src', nextUpSrc);
        });
        
        //back
        $navBackBtn.on("click", function(){
            back();
            playButtonSound();
        });

        $navBackBtn.on("mouseover", function(){
            $(this).children('img').attr('src', backOver.src);
        });
        $navBackBtn.on("mouseout", function(){
            $(this).children('img').attr('src', backUpSrc);
        });
        
        //help
        $helpBtn.on("click", function(){
            window.open('../common/help.html');
            playButtonSound();
        });

        $helpBtn.on("mouseover", function(){
            $(this).children('img').attr('src', helpOver.src);
        });
        $helpBtn.on("mouseout", function(){
            $(this).children('img').attr('src', helpUpSrc);
        });
        
        //glossary
        if(link_glossary !== ""){
            $glossaryBtn.on("click", function(){
                window.open(link_glossary);
                playButtonSound();
            });
    
            $glossaryBtn.on("mouseover", function(){
                $(this).children('img').attr('src', glossaryOver.src);
            });
            $glossaryBtn.on("mouseout", function(){
                $(this).children('img').attr('src', glossaryUpSrc);
            });
        }else{
            //no glossary, disable glossary button
            $glossaryBtn.css('visibility', 'hidden');
        }
        
        //resources
        if(link_resources !== ""){
            $resourcesBtn.on("click", function(){
                window.open(link_resources);
                playButtonSound();
            });
    
            $resourcesBtn.on("mouseover", function(){
                $(this).children('img').attr('src', resourcesOver.src);
            });
            $resourcesBtn.on("mouseout", function(){
                $(this).children('img').attr('src', resourcesUpSrc);
            });
        }else{
            //no resources, disable resources button
            $resourcesBtn.css('visibility', 'hidden');
        }

        
        //CC
        $audioTranscriptBtn.on("click", function(){
            manageTranscriptBox();
            playButtonSound();
        });

        $audioTranscriptBtn.on("mouseover", function(){
            $(this).children('img').attr('src', transcriptOver.src);
        });
        $audioTranscriptBtn.on("mouseout", function(){
            $(this).children('img').attr('src', transcriptUpSrc);
        });

        //508 
        $508Btn.on("click", function(){
            //change this to open the 508 document
            window.open(link_508);
            playButtonSound();
        });

        $508Btn.on("mouseover", function(){
            $(this).children('img').attr('src', btn508Over.src);
        });
        $508Btn.on("mouseout", function(){
            $(this).children('img').attr('src', btn508UpSrc);
        });

        //player controls for the loaded page
        //play
        $playBtn.on("click", function(){
            playButtonSound();
            try{
                $pageContentFrame[0].contentWindow.adayana.audioPlayer.play();
            }catch(e){}
        });

        $playBtn.on("mouseover", function(){
            $(this).children('img').attr('src', playOver.src);
        });
        $playBtn.on("mouseout", function(){
            $(this).children('img').attr('src', playUpSrc);
        });

        //pause
        $pauseBtn.on("click", function(){
            playButtonSound();
            try{
                $pageContentFrame[0].contentWindow.adayana.audioPlayer.stop();
            }catch(e){}
        });

        $pauseBtn.on("mouseover", function(){
            $(this).children('img').attr('src', pauseOver.src);
        });
        $pauseBtn.on("mouseout", function(){
            $(this).children('img').attr('src', pauseUpSrc);
        });

        //rewind
        $rewindBtn.on("click", function(){
            playButtonSound();
            try{
                $pageContentFrame[0].contentWindow.adayana.audioPlayer.restart();
            }catch(e){}
        });

        $rewindBtn.on("mouseover", function(){
            $(this).children('img').attr('src', rewindOver.src);
        });
        $rewindBtn.on("mouseout", function(){
            $(this).children('img').attr('src', rewindUpSrc);
        });

        //transcript close button
        $('#transcriptClose').on("click", function(){
            playButtonSound();
            manageTranscriptBox();
            //closeTranscriptBox();
        });
    }
    
    function enableNext(){
        //if it's not the last page of a lesson.
        if(currentPage !== totalPages - 1){
        nextUnlocked = true;
        $navNextBtn.css("visibility", "visible");
            nextUnlocked = true;
            $navNextBtn.css("visibility", "visible");
        }

        //after a page is complete, update the sessionPageProgress
        if(currentPage > sessionPageProgress){
            sessionPageProgress = currentPage;
        }
    }
    function disableNext(){
        //If the lesson isn't complete, lock the next navigation
        //If the lesson is complete, allow free navigation
        //|| -  Allow the Next button to be disabled on the last page
        if(!checkLessonCompletionFlag || currentPage >= (totalPages - 2)){
            nextUnlocked = false;
            $navNextBtn.css("visibility", "hidden");
        }
    }

    function enableBack(){
        $navBackBtn.css("visibility", "visible");
    }
    function disableBack(){
        $navBackBtn.css("visibility", "hidden");
    }

    //enable and disable the audio control buttons
    function enableAudioControls(){
        $playBtn.css("visibility", "visible");
        $pauseBtn.css("visibility", "visible");
        $rewindBtn.css("visibility", "visible");
        $audioTranscriptBtn.css("visibility", "visible");

        //if the cc should be open, open it
        if(ccBoxShouldRemainOpen){
            openTranscriptBox();
        }
    }
    function disableAudioControls(){
        $playBtn.css("visibility", "hidden");
        $pauseBtn.css("visibility", "hidden");
        $rewindBtn.css("visibility", "hidden");
        $audioTranscriptBtn.css("visibility", "hidden");
    }
    
    function updateLocation(url) {
        doLMSSetValue('cmi.location',url);
    }
    
    function manageTranscriptBox(){
        if(transcriptOpen){
            closeTranscriptBox();
            ccBoxShouldRemainOpen = false;
        }
        else{
            openTranscriptBox();
            ccBoxShouldRemainOpen = true;
        }
    }
    
    function openTranscriptBox(){
        $('#transcriptBox').show();
        if(resetTranscriptScroll){
            $('#transcriptText').scrollTop(0);
            resetTranscriptScroll = false;
        }
        transcriptOpen = true;
    }

    function closeTranscriptBox(){
        $('#transcriptBox').hide();
        transcriptOpen = false;
    }

    function updateTranscriptText(){
        resetTranscriptScroll = true;
        $('#transcriptText').html(progress[currentPage].transcript);
    }
    
    function checkLessonCompletion(){
        
        if(currentPage === totalPages - 1 && lessonCompleted == false) {
            lessonCompleted=true;
            doLMSSetValue('cmi.completion_status','completed');
            checkLessonCompletionFlag=true;
        }
    }

    //play a sound on button clicks, if the sound is defined
    function playButtonSound(){
        if(typeof btnClickSound !== 'undefined'){
            btnClickSound.currentTime = 0;
            btnClickSound.play();
        }
    }

    function adyReady(ad){
        showContent();
        audioPlayerRef = ad.audioPlayer;
    }

    function showContent(){
        $pageContentFrame.animate({opacity: 1}, 200);
    }

    function hideContent(){
        if(useFadeTransitions){
            $pageContentFrame.css("opacity", 0);
        }
        audioPlayerRef = null;
    }

    function enableUnlockingKeycodes(){
        //keycode
        var ctrlDown = false;//17
        var altDown = false;//18

        $(document).on("keydown", function(e){
            if(e.which === 17){
                ctrlDown = true;
            }
            if(e.which === 18){
                altDown = true;
            }
        });        
        $(document).on("keyup", function(e){
            if(e.which === 17){
                ctrlDown = false;
            }
            if(e.which === 18){
                altDown = false;
            }
        });
        $('#pageNumber').on("click", function(e){
            if(ctrlDown && altDown){
                enableNext();
            }
        });
    }
    
    //expose these functions to be called from outside
    window.enableNext = enableNext;
    window.disableNext = disableNext;
    window.enableAudioControls = enableAudioControls;
    window.adyReady = adyReady;
    
})(window, document, jQuery);