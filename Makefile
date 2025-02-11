# -----------\ Name \--------------------------------------------------------- #

NAME    := Stalker

# -----------\ Files \-------------------------------------------------------- #

ENV_FILE = .env
COMPOSE = docker-compose.yml
COMPOSE_CMD = docker compose -f $(COMPOSE) --env-file $(ENV_FILE)

# -----------\ Color Codes for Terminal Output \----------------------------- #

RED   := \033[0;31m
GREEN := \033[0;32m
BOLD  := \033[1m
RESET := \033[0m

# -----------\ Rules \-------------------------------------------------------- #

all: $(NAME)

$(NAME): check_env
		@$(COMPOSE_CMD) up

run: check_env
		@$(COMPOSE_CMD) build
		@$(COMPOSE_CMD) up

build: check_env
		@$(COMPOSE_CMD) up --build

down:
		@$(COMPOSE_CMD) down

clean:
		@$(COMPOSE_CMD) down
		@$(COMPOSE_CMD) rm -f
		@docker image prune -a -f

fclean: clean
		docker system prune -f

re: clean all

# -----------\ ENV Check and Creation \--------------------------------------- #

check_env:
		@if [ ! -f "$(ENV_FILE)" ]; then \
				echo -e "$(RED)$(BOLD)ERROR: .env file not found!$(RESET)"; \
				echo "Creating .env file..."; \
				echo "FT_CLIENT_ID=" >> $(ENV_FILE); \
				echo "FT_CLIENT_SECRET=" >> $(ENV_FILE); \
				echo "EMAIL_USER=" >> $(ENV_FILE); \
				echo "EMAIL_PASS=" >> $(ENV_FILE); \
				echo -e "$(GREEN).env file created. Please follow the instructions in the README file to add the appropriate values.$(RESET)"; \
				echo -e "$(RED)Then run make build again$(RESET)"; \
				exit 1; \
		fi

.PHONY: all build down re clean fclean check_env
