letter = 'P'
print(letter)
print(len(letter))
greeting ="hello, world!"
print(greeting)
print(len(greeting))
sentence = "I hope you are enjoying 30 days of Python Challenge"
print(sentence)
multiline_string = '''I would like to create a multiple lines paragraph.
using 3' or " seems to be the right way to do it.
Just Try it.'''
print(multiline_string)
name =  'Mario'
last_name = 'Rossi'
space = ' '
full_name = name + space + last_name
print(full_name)
print(len(full_name))

radius = 10
pi = 3.14
area = pi * radius ** 2
formated_string  = "The area of circle with a radius %d is %.2f." %(radius, area)
print(formated_string)
python_libraries = ['Django', 'Flask', 'NumPy', 'Matplotlib', 'Pandas']

formated_string2 = "The following are python libraries:%s" %(python_libraries)

print(formated_string2)

a = "Andrea"
b = "La Rosa"
c = "patatine"
formated_string = "Sono {} {} e mi piacciono {}".format(a,b,c)
print(formated_string)

a = 4
b = 3 
print(f'{a}+{b} = {a+b}')
print(f'{a}-{b} = {a-b}')
print(f'{a}*{b} = {a*b}')
print(f'{a}/{b} = {a/b:.2f}')
print(f'{a}%{b} = {a%b}')
print(f'{a}//{b} = {a//b}')
print(f'{a} ** {b} = {a ** b}')

