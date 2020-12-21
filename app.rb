require 'dotenv/load'
require 'active_support/all'
require 'sinatra'
require "sinatra/reloader" if development?
require "sinatra/json"
require 'httparty'
require 'byebug'

module OpenTransact
    class Client
        include HTTParty
        base_uri ENV["OPENTRANSACT_BASE_URI"]
        headers 'Accept' => 'application/vnd.api+json'
        headers 'Content-Type' => 'application/vnd.api+json'

        def self.application_id
            ENV["OPENTRANSACT_APPLICATION_ID"] 
        end

        def self.api_key
            ENV["OPENTRANSACT_API_KEY"]
        end

        headers 'Authorization' => "Bearer #{api_key}"

        def self.client_token_role_id
            ENV["OPENTRANSACT_CLIENT_TOKEN_ROLE_ID"]
        end

        def self.valid_configuration?
            base_uri && application_id && api_key && client_token_role_id
        end
    end


    class Resource
        attr_accessor :resource_id
        attr_accessor :attributes

        def initialize(json)
            @resource_id = json["id"]
            @attributes = OpenStruct.new(json["attributes"].deep_transform_keys! { |key| key.underscore })
        end

        def as_json
            attributes.to_h
        end
    end

    class Profile < Resource
        def self.all
            response = Client.get('/v1/profiles', query: { filter: {'application-id': Client.application_id } } )
            data = response.parsed_response["data"]
            data.map do |item|
                new(item)
            end
        end

        def self.get(id)
            response = Client.get("/v1/profiles/#{id}")
            data = response.parsed_response["data"]
            new(data)
        end

        def self.create(params)
            body = {
                data: {
                    type: "profiles",
                    attributes: {
                        owner: {
                            type: params[:owner_type],
                            'first-name': params[:first_name],
                            'last-name': params[:last_name]
                        }
                    },
                    relationships: {
                        application: {
                            data: { 
                                type: "applications", 
                                id: Client.application_id
                            }
                        }
                    }
                }
            }
            
            response = Client.post("/v1/profiles", body: body.to_json)
            data = response.parsed_response["data"]
            new(data)
        end

        def name
            [attributes.owner["first_name"], attributes.owner["last_name"]].join(" ")
        end
    end

    class ClientToken < Resource
        def self.create(profile_id)
            body = {
                data: {
                    type: "client-tokens",
                    attributes: {
                    },
                    relationships: {
                        roles: {
                            data: [{ 
                                type: "roles", 
                                id: Client.client_token_role_id
                            }]
                        },
                        subject: {
                            data: {
                                type: "profiles",
                                id: profile_id
                            }
                            
                        }
                    }
                }
            }
            response = Client.post("/v1/client-tokens", body: body.to_json)
            data = response.parsed_response["data"]
            new(data)
        end
    end
end

set :port, ENV["OPENTRANSACT_DEMO_PORT"] || 3000

helpers do
    def api_endpoint
        OpenTransact::Client.base_uri
    end

    def accounts_url(profile)
        "#{OpenTransact::Client.base_uri}/v1/accounts?filter[owner-type]=profiles&filter[owner-id]=#{profile.resource_id}"
    end

    def create_account_url
        "#{OpenTransact::Client.base_uri}/v1/accounts"
    end

    def addresses_url(profile)
        "#{OpenTransact::Client.base_uri}/v1/addresses?filter[application-id]=#{OpenTransact::Client.application_id}&filter[owner-type]=profiles&filter[owner-id]=#{profile.resource_id}"
    end

    def create_address_url
        "#{OpenTransact::Client.base_uri}/v1/addresses"
    end

    def phone_numbers_url(profile)
        "#{OpenTransact::Client.base_uri}/v1/phone-numbers?filter[application-id]=#{OpenTransact::Client.application_id}&filter[owner-type]=profiles&filter[owner-id]=#{profile.resource_id}"

    end

    def email_addresses_url(profile)
        "#{OpenTransact::Client.base_uri}/v1/email-addresses?filter[application-id]=#{OpenTransact::Client.application_id}&filter[owner-type]=profiles&filter[owner-id]=#{profile.resource_id}"
    end

    def recent_activity_url(profile)
        "#{OpenTransact::Client.base_uri}/v1/activities?filter[application-id]=#{OpenTransact::Client.application_id}&filter[profile-id]=#{profile.resource_id}"
    end

    def transactions_url(profile)
        "#{OpenTransact::Client.base_uri}/v1/transactions?filter[application-id]=#{OpenTransact::Client.application_id}&filter[profile-id]=#{profile.resource_id}"
    end
end

before do
    redirect '/config' if request.path_info != "/config" && !OpenTransact::Client.valid_configuration?
end

get '/' do
    @profiles = OpenTransact::Profile.all
    erb :index
end

get '/config' do
    if OpenTransact::Client.valid_configuration?
        redirect '/'
    else
        erb :config
    end
end

get '/profiles/:id' do
    @profiles = OpenTransact::Profile.all
    @profile = OpenTransact::Profile.get(params[:id])
    erb :index
end

post '/profiles' do
    @profile = OpenTransact::Profile.create(params)
    redirect  "/profiles/#{@profile.resource_id}"
end

post '/profiles/:profile_id/client-token' do
    @client_token = OpenTransact::ClientToken.create(params[:profile_id])
    json @client_token.as_json
end

post '/transactions' do
end