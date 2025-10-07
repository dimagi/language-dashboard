# Writing scripts
Unless explicitly asks for something different, you should default to:
* Write all scripts in Python
* Use python-dotenv to load local .env files with replacement
* Use pandas for complex data analysis
* Use click for CLIs
* Use rich for beautiful and functional CLI interfaces
* Use native `uv` for package management and isolation

## Executable scripts
If this is a script meant to be executed on its own (as opposed to a module in a larger project, for example), you MUST:
* Use the `uv` script mode header. Here is an example:
```
# /// script
# requires-python = ">=3.11"
# dependencies = [
#    "aiohttp>=3.8.0",
#    "pandas>=1.5.0",
#    "langchain>=0.1.0",
#    "langchain-openai>=0.1.0",
#    "langchain-core>=0.1.0",
#    "pydantic>=2.0.0",
# ]
# ///

#!/usr/bin/env -S uv run --script
```
This will enable the script to execute in its own environment with an ephemeral environment


## Script Execution
When executing scripts with uv script mode headers, ALWAYS use: uv run --script script_name.py NOT `python script_name.py`

## Ephemeral tests
Use UVX for ephemeral Python code that you want to execute. For example:

```
uvx --with pyyaml python3 -c "
import yaml                   
with open('config.yaml', 'r') as f:
    config = yaml.safe_load(f)
    print('Configuration loaded successfully!')
    print('System prompt file:', config['generation']['system_prompt_file'])
    print('User prompt template:', config['generation']['user_prompt_template'])
    print('Model:', config['openai']['model']) 
" 
```