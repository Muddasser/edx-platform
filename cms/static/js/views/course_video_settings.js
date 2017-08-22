/**
 * CourseVideoSettingsView shows a sidebar containing course wide video settings.
 */
define([
    'jquery', 'backbone', 'underscore', 'gettext',
    'edx-ui-toolkit/js/utils/html-utils',
    'edx-ui-toolkit/js/utils/string-utils',
    'text!templates/course-video-settings.underscore'
],
function($, Backbone, _, gettext, HtmlUtils, StringUtils, TranscriptSettingsTemplate) {
    'use strict';

    var CourseVideoSettingsView = Backbone.View.extend({
        el: 'div.video-transcript-settings-wrapper',

        events: {
            'change #transcript-provider': 'providerSelected',
            'change #transcript-turnaround': 'turnaroundSelected',
            'change #transcript-fidelity': 'fidelitySelected',
            'click .action-add-language': 'addLanguageMenu',
            'click .action-select-language': 'languageAdded',
            'click .action-cancel-language': 'languageCancelled',
            'click .action-remove-language': 'languageRemoved',
            'click .action-update-course-video-settings': 'updateCourseVideoSettings',
            'click .action-close-course-video-settings': 'closeCourseVideoSettings'
        },

        initialize: function(options) {
            var videoTranscriptSettings = options.videoTranscriptSettings;
            this.activeTranscriptionPlan = options.activeTranscriptPreferences;
            this.availableTranscriptionPlans = videoTranscriptSettings['transcription_plans'];
            this.transcriptHandlerUrl = videoTranscriptSettings['transcript_preferences_handler_url'];
            this.videoTranscriptEnabled = !_.isEmpty(this.activeTranscriptionPlan) || !_.isEmpty(this.availableTranscriptionPlans) ? true : false;
            this.template = HtmlUtils.template(TranscriptSettingsTemplate);
            this.selectedProvider = '';
            this.selectedTurnaroundPlan = '';
            this.selectedFidelityPlan = '';
            this.availableLanguages = [];
            this.activeLanguages = [];
            this.selectedLanguages = [];
            this.setTranscriptData();
            this.listenTo(Backbone, 'coursevideosettings:showCourseVideoSettingsView', this.render);
        },

        getProviderPlan: function() {
            return this.availableTranscriptionPlans;
        },

        getTurnaroundPlan: function() {
            if (this.selectedProvider){
                return this.availableTranscriptionPlans[this.selectedProvider].turnaround;
            }
        },

        getFidelityPlan: function() {
            if (this.selectedProvider == 'Cielo24') {
                return this.availableTranscriptionPlans[this.selectedProvider].fidelity;
            }
        },

        getPlanLanguages: function() {
            if (this.selectedProvider){
                var selectedPlan = this.availableTranscriptionPlans[this.selectedProvider];
                if (this.selectedProvider == 'Cielo24') {
                    return selectedPlan.fidelity[this.selectedFidelityPlan].languages;
                }
                return selectedPlan.languages;
            }
        },

        fidelitySelected: function(event) {
            this.selectedFidelityPlan = event.target.value;
            this.manageLanguageContainer();
        },

        turnaroundSelected: function(event) {
            this.selectedTurnaroundPlan = event.target.value;
            this.manageLanguageContainer();
        },

        providerSelected: function(event) {
            this.selectedProvider = event.target.value;
            this.populatePreferenceOptions();
        },

        manageLanguageContainer: function() {
            var isTurnaroundSelected = this.$el.find('#transcript-turnaround')[0].options.selectedIndex,
                isFidelitySelected = this.$el.find('#transcript-fidelity')[0].options.selectedIndex;

            if ((isTurnaroundSelected > 0 && this.selectedProvider === '3PlayMedia') || (isTurnaroundSelected  > 0 && isFidelitySelected > 0)) {
                this.availableLanguages = this.getPlanLanguages();
                this.$el.find('.transcript-languages-wrapper').show();
            } else {
                this.availableLanguages = {};
                this.$el.find('.transcript-languages-wrapper').hide();
            }
        },

        setTranscriptData: function(){
            if (this.activeTranscriptionPlan) {
                this.selectedProvider = this.activeTranscriptionPlan['provider'];
                this.selectedFidelityPlan = this.activeTranscriptionPlan['cielo24_fidelity'];
                this.selectedTurnaroundPlan = this.activeTranscriptionPlan['cielo24_turnaround'] ? this.activeTranscriptionPlan['cielo24_turnaround']: this.activeTranscriptionPlan['three_play_turnaround'];
                this.activeLanguages = this.activeTranscriptionPlan['preferred_languages'];
            }
        },

        populatePreferenceOptions: function() {
            var self = this,
                providerPlan = self.getProviderPlan(),
                turnaroundPlan = self.getTurnaroundPlan(),
                fidelityPlan = self.getFidelityPlan(),
                $provider = self.$el.find('#transcript-provider'),
                $turnaround = self.$el.find('#transcript-turnaround'),
                $fidelity = self.$el.find('#transcript-fidelity');

            // TODO: Hide un-related things in None provider selected even if they were selected before.
            // if previously languages were shown, and now a different turnaround/fidelity is selected, update language options too

            // Provider dropdown
            $provider.empty().append(new Option('Select provider', ''));
            _.each(providerPlan, function(providerObject, key){
                var option = new Option(providerObject.display_name, key);
                if (self.selectedProvider === key) {
                    option.selected = true;
                }
                $provider.append(option);
            });

            if(turnaroundPlan) {
                // Turnaround dropdown
                $turnaround.empty().append(new Option('Select turnaround', ''));
                _.each(turnaroundPlan, function (value, key) {
                    var option = new Option(value, key);
                    if (self.selectedTurnaroundPlan === key) {
                        option.selected = true;
                    }
                    $turnaround.append(option);
                });
                self.$el.find('.transcript-turnaround-wrapper').show();
            }

            // Fidelity dropdown
            if (fidelityPlan) {
                $fidelity.empty().append(new Option('Select fidelity', ''));
                _.each(fidelityPlan, function(fidelityObject, key){
                    var option = new Option(fidelityObject.display_name, key);
                    if (self.selectedFidelityPlan === key) {
                        option.selected = true;
                    }
                    $fidelity.append(option);
                });
                self.$el.find('.transcript-fidelity-wrapper').show();
            } else {
                self.$el.find('.transcript-fidelity-wrapper').hide();
            }

            self.manageLanguageContainer();
        },

        saveTranscriptPreferences: function() {
            var self = this;
            $.postJSON(this.transcriptHandlerUrl, {
                provider: self.selectedProvider,
                cielo24_fidelity: self.selectedFidelityPlan,
                cielo24_turnaround: self.selectedProvider === 'Cielo24' ? self.selectedTurnaroundPlan : '',
                three_play_turnaround: self.selectedProvider === '3PlayMedia' ? self.selectedTurnaroundPlan : '',
                preferred_languages: self.selectedLanguages
            }, function(data) {
                if (data.transcript_preferences) {
                    self.activeTranscriptionPlan = data.transcript_preferences;
                    // Sync ActiveUploadListView with latest active plan.
                    Backbone.trigger('coursevideosettings:syncActiveTranscriptPreferences', self.activeTranscriptionPlan);
                } else {
                    // error case ?
                }
            })
        },

        addLanguageMenu: function() {
            var availableLanguages,
                $transcriptLanguage,
                $languagesContainer = this.$el.find('.languages-menu-container'),
                totalCurrentLanguageMenus = $languagesContainer.find('.transcript-language-menu').length;

            // Omit out selected languages from selecting again.
             availableLanguages = _.omit(this.availableLanguages, this.selectedLanguages);

            HtmlUtils.append(
                $languagesContainer,
                HtmlUtils.joinHtml(
                    HtmlUtils.HTML('<div class="transcript-language-menu-container">'),
                    HtmlUtils.interpolateHtml(
                        HtmlUtils.HTML('<select class="transcript-language-menu" id="transcript-language-menu-{languageMenuId}"></select>'),
                        {
                            languageMenuId: totalCurrentLanguageMenus
                        }
                    ),
                    HtmlUtils.HTML('<a href="#" class="action-select-language">Add</a>'),
                    HtmlUtils.HTML('<a href="#" class="action-cancel-language">Cancel</a>'),
                    HtmlUtils.HTML('</div>')
                )
            );
            $transcriptLanguage = this.$el.find('#transcript-language-menu-' + totalCurrentLanguageMenus);

            $transcriptLanguage.append(new Option('Choose a language', ''));
            _.each(availableLanguages, function(value, key){
                $transcriptLanguage.append(new Option(value, key));
            });
        },

        setActiveLanguages: function() {
            var self = this,
                $languagesContainer = this.$el.find('.languages-menu-container');

            _.each(this.activeLanguages, function(activeLanguage){
                // Only add if not in the list already.
                if (_.indexOf(self.selectedLanguages, activeLanguage) === -1) {
                    self.selectedLanguages.push(activeLanguage);
                    HtmlUtils.append(
                        $languagesContainer,
                        HtmlUtils.joinHtml(
                            HtmlUtils.HTML('<div class="transcript-language-menu-container">'),
                            HtmlUtils.interpolateHtml(
                                HtmlUtils.HTML('<span>{languageDisplayName}</span>'),
                                {
                                    languageDisplayName: self.availableLanguages[activeLanguage]
                                }
                            ),
                            HtmlUtils.interpolateHtml(
                                HtmlUtils.HTML('<a href="#" class="action-remove-language" data-language-code="{languageCode}">Remove</a>'),
                                {
                                    languageCode: activeLanguage
                                }
                            ),
                            HtmlUtils.HTML('</div>')
                        )
                    );
                }
            });
        },

        languageAdded: function(event) {
            var $parentEl = $(event.target.parentElement),
                selectedLanguage = $parentEl.find('select').val();

            // Only add if not in the list already.
            if (selectedLanguage && _.indexOf(this.selectedLanguages, selectedLanguage) === -1) {
                this.selectedLanguages.push(selectedLanguage);
                HtmlUtils.setHtml(
                    $parentEl,
                    HtmlUtils.joinHtml(
                        HtmlUtils.interpolateHtml(
                            HtmlUtils.HTML('<span>{languageDisplayName}</span>'),
                            {
                                languageDisplayName: this.availableLanguages[selectedLanguage]
                            }
                        ),
                        HtmlUtils.interpolateHtml(
                            HtmlUtils.HTML('<a href="#" class="action-remove-language" data-language-code="{languageCode}">Remove</a>'),
                            {
                                languageCode: selectedLanguage
                            }
                        )
                    )
                )
            }
        },

        languageCancelled: function(event) {
            $(event.target.parentElement).remove();
        },

        languageRemoved: function(event) {
            var selectedLanguage = $(event.target).data('language-code');
            $(event.target.parentElement).remove();
            this.selectedLanguages.pop(selectedLanguage);
        },

        closeCourseVideoSettings: function(event) {
            // trigger destroy transcript event.
            Backbone.trigger('coursevideosettings:destroyCourseVideoSettingsView');

            // Unbind any events associated
            this.undelegateEvents();

            // Empty this.$el content from DOM
            this.$el.empty();

            this.selectedLanguages = [];
        },

        updateCourseVideoSettings: function(event) {
            this.saveTranscriptPreferences();
            this.closeCourseVideoSettings();
        },

        render: function(options) {
            HtmlUtils.setHtml(
                this.$el,
                this.template(options)
            );
            // populate video transcript
            if (this.videoTranscriptEnabled){
                this.populatePreferenceOptions();
            }

            if (this.activeLanguages) {
                this.setActiveLanguages();
            } else {
                // Add a language dropdown if active languages is empty.
                this.addLanguageMenu();
            }
            return this;
        }
    });

    return CourseVideoSettingsView;
});
